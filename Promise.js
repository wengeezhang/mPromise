/*
author:wengeezhang;
version:2.0;
updated 2015/7/15
update:microtask,res(async/sync-promise)
************
*interface
prototype:     then,catch
static method: all,race,resolve,reject
************
** EXAMPLE
x_promise.then(F1,F2).then(F3,F4).[---].then(Fm,Fn).
** ANALYSIS
x_promise:      a promise which is async.
chain:          promise(x_promise)->promise(F1/2)->promise(F3/4)...->promise(Fm/n)
promise_Holder: an empty promise returned immediately by x_promise.then(F1,F2).In chain.
promise_air:    a promise returned by F1/2();Not in chain.
placeholder:    a property of promise_air;    It refers to promise_Holder.
promise_air.placeholder=promise_Holder.
************
promise_Holder is in the chain and holds original information(subPromise) of the chain.
promise_air isn't in chain,but it can self be executed in the future and will catch the result and state.
finally,refresh promise_Holder's info with promise_air's. (bridge is placeholder)
*:then's inner's return is a promise_air,and it's placeholder is then's promise_Holder.
*IMPORTANT:
Every <then> has its only one return,and this return creats/is the promise_air;
When return a chain,returning the last <then>'s promise_Holder; 
So,when we check a <then>'s promise_air,this promise_air's *promise_Holder* 
     *may has subPromises,
     *may be the end of a chain and be returned,so it becomes another promise_air
And any <then> being the end of a chain which is returned inside another <then> must be checked because of bug1
**due to including of microtask,sync process is also pending,so _placeholderSubprosCheck must be an iterator.
very tip:******as for any promise that need subPromise check in future,just set air.placeholder to it.
****very important:
'parallel subPromise check' checks curSubPromise.subPromiseArr.length
'_placeholderSubprosCheck'  checks curSubPromise.placeholder
************
principle 1: every promise in a chain can't be replaced considering correct referring
principle 2: one promise can have only one fullfilResult/rejectResult,but can have an array of fullfilFuns/rejecFuns or subPromises
It's meanless but throw no error:var a=new Promise(function(res,rej){res("wai");return new Promise(function(res,rej){res("nei");})})
************
bug1:
    then()'s return--promise chain;
    var a=x_promise.then(function(value){
          return y_promise.then(function(){/ajax process/});
    })
    a.then()

  问题点：promise_air_A对应的promise_holder是另外一个promise_holder的promise_air
*/
(function(root){
  function _microDefer(thisArg,cb,arr){
    if(typeof MutationObserver == 'function'){
      var ele=document.createElement("div");
      new MutationObserver(function(){cb.apply(thisArg,arr);}).observe(ele,{attributes:true});
      ele.setAttribute('change','yes');
    }else if(typeof MessageChannel == 'function'){
      var channel=new MessageChannel();
      channel.port1.onmessage=function(){cb.apply(thisArg,arr);};
      channel.port2.postMessage("trigger");
    }else{
      setTimeout(function(){cb.apply(thisArg,arr);},0);
    }
  }
  function _placeholderSubprosCheck(promise_air){//the only aim:check subPromise exist
    //intend name: 'is other's promise_air as to this promise_horder(promise_holder)'
    //tips:the arg is promise_air,but i'll change it to promise_holder for better.
    //here,a promise_holder becomes another promise_holder's promise_air
    if(promise_air.placeholder){
      //promise_air may be then end of a chain which is returned inside a <then>
      //so that_placeholder becomes a promise_air
      _shipandAircheck(promise_air.placeholder,promise_air.result,promise_air.state);
      /*then()'s return--promise chain;
      var a=x_promise.then(function(value){
            return y_promise.then(function(){/ajax process/});
      })
      a.then()
      here,promise_air is y_promise.then(),(acturally,it is a promise_holder)
      promise_air.placeholder is a.then()
      */
      if(promise_air.placeholder.subPromiseArr.length){
        _execThenOf(promise_air.placeholder);
      }
    }
  }
  function _checkResultOf(result,fatherPro,flag){
    if(result && result instanceof fatherPro.constructor){
      if(result.state == 'pending'){
        result.placeholder=fatherPro;
        flag.hangup=true;
        return;
      }else{
        flag.state=result.state;
        return _checkResultOf(result.result,fatherPro,flag);
      }
    }else if(result && typeof result.then == 'function'){
      var callResolve=false,supResult;
      result.then(function(val){
        supResult=val;callResolve=true;
        flag.state="resolved";
      },function(val){
        supResult=val;callResolve=true;
        flag.state="rejected";
      });
      if(!callResolve){flag.hangup=true;return;}
      return _checkResultOf(supResult,fatherPro,flag);
    }else{
      return result;
    }
  }
  function _thenCbExeAndAircheck(pro_placeholder,fatherPro,index){
    var supResult,thenCb,flag={hangup:false};
    //select thenCb,supResult
    if(fatherPro.state == 'resolved'){
      flag.state="resolved";//init,may be changed in _checkResultOf
      //two scenes that will change state:result is sync promise instance or thenable
      supResult = _checkResultOf(fatherPro.result,fatherPro,flag);
      if(flag.hangup){
        return;
      }
      if(flag.state=="resolved"){
        thenCb=fatherPro.fullfilFunArr[index];
      }else{
        thenCb=fatherPro.rejectFunArr[index];
      }
    }else{
      flag.state="rejected";
      supResult = fatherPro.result;
      thenCb=fatherPro.rejectFunArr[index];
    }
    //check thenCb null
    if(thenCb===null){
      _shipandAircheck(pro_placeholder,supResult,flag.state);
      return;
    }
    pro_air=thenCb(supResult);
    fatherPro.thened=true;//must not in "check thenCb null".
    if(pro_air instanceof pro_placeholder.constructor){
      pro_air.placeholder=pro_placeholder;//do not delete:return chain
      if(pro_air.state != 'pending'){
        _shipandAircheck(pro_placeholder,pro_air.result,pro_air.state);
      }
    }else{//pro_air is string/object
      _shipandAircheck(pro_placeholder,pro_air,'resolved');
    }
  }
  function _shipandAircheck(proHolder,result,state){
    proHolder.state=state;
    proHolder.result=result;
    _placeholderSubprosCheck(proHolder);
  }
  function _execThenCb(thenCalledPro,sync){
     //thenCalledPro:promise calling "then"
    var thenCbArr,pro_placeholder,subPromiseLen;
    subPromiseLen=thenCalledPro.subPromiseArr.length;
    if(thenCalledPro.thened){return;}//a.then a.then a-sync;
    //var a=new promise() --sync
    //a.then();a.then()
    //then is micro-task,so these two then's cb will be called in the future
    //but in this structure,the first then will exec all in one time
    // however,if you just code like this,bug comes when you split [a.then]s in two place
    //like call first a.then,after some time that the microtask is finished,call second a.then
    //in second time,a.thened is true,so it'll not do bellow

    //thenCalledPro.thened=true moveto _thenCbExeAndAircheck
    for(var i=0;i<subPromiseLen;i++){
        pro_placeholder=thenCalledPro.subPromiseArr[i];
        _thenCbExeAndAircheck(pro_placeholder,thenCalledPro,i);
    }
    //parallel subPromise check
    //i'll move into another fun called "go for sync_promise's subPromise"
    for(var j=0;j<subPromiseLen;j++){
      pro_placeholder=thenCalledPro.subPromiseArr[j];
      if(pro_placeholder.state != 'pending'){
        if(pro_placeholder.subPromiseArr.length){
          _execThenOf(pro_placeholder);
        }
      }//else:result instanceof Promise,so it's then will be called in the future.
    }
  }
  function _execThenOf(thenCalledPro){//async then calling
    _microDefer(null,_execThenCb,[thenCalledPro,0]);
  }
  function _microThen(thisArg){//sync then calling
    var pro_placeholder=new thisArg.constructor(),pro_air;
    thisArg.subPromiseArr.push(pro_placeholder);
    _microDefer(null,_execThenCb,[thisArg,1]);
    return pro_placeholder;//
  }
  function Promise(executor) {
      this.state = "pending";
      this.fullfilFunArr = [];
      this.rejectFunArr = [];
      this.thened=false;
      this.result = null;//only one-resolved/rejected
      this.subPromiseArr = [];
      this.placeholder=null;
      if(!executor){//can aslo add '||typeof executor != "function"'
        return;
      }
      var that = this,that_placeholder; 
      function _resrej(result,state){
        that.state = state;
        that.result = result;
        if(that.placeholder){//this promise is created and returned in 'then'
          that_placeholder=that.placeholder;
          that_placeholder.result=result;
          that_placeholder.state=state;
          if(that_placeholder.subPromiseArr.length){//looks forward 
            _execThenOf(that_placeholder);
          }
          //below fixes bug1:
          _placeholderSubprosCheck(that_placeholder);
        }else{
          if(that.subPromiseArr.length){
            _execThenOf(that);
          }
        }
      }
      //entry point
      executor(function(e) {
          _resrej(e,"resolved");
      }, function(e) {
          _resrej(e,"rejected");
      });
  }
  Promise.prototype.then = function(f, r) {
      this.fullfilFunArr.push(f || null);
      this.rejectFunArr.push(r || null);
      var result,thenGenePro;
      //async:wait and _microDefer;
      //sync:microDefer;
      if(this.state == 'pending'){
        thenGenePro=new this.constructor();
        this.subPromiseArr.push(thenGenePro);//async,we call this empty promise "promise_Holder".
        return thenGenePro;
      }else{
        return _microThen(this);
      }
  };
  Promise.prototype.catch=function(callback){
    return this.then(null,callback);
  };
  //static methods
  Promise.resolve=function(value){
    if(value && typeof value=="object" && value.constructor==Promise){//Promise instance
      return value;
    }
    return new Promise(function(res,rej){res(value);});//thenable obj or others
  };
  Promise.reject=function(reason){
    return new Promise(function(res,rej){rej(reason);});
  };
  Promise.all=function(entities){
    var allPromise = new Promise(function(res,rej){
      var entityLen=entities.length;
      var fullfilmentArr=[],rejectFlag=false,entitiesResNum=0;
      for(var i=0;i<entityLen;i++){
        if(rejectFlag){
          break;
        }
        function lcFun(n){//fix closure bug
          entities[n].then(function(value){
            if(!rejectFlag){
              entitiesResNum+=1;
              fullfilmentArr[n]=value;
              if(entitiesResNum==entityLen){
                res(fullfilmentArr);
              }
            }
          }).catch(function(reason){
            if(!rejectFlag){
              rejectFlag=true;
              rej(reason);
            }
          });
        }
        lcFun(i);
      }
    });
    return allPromise;
  };
  Promise.race=function(entities){
    var racePromise = new Promise(function(res,rej){
      var entityLen=entities.length,setFlag=false;
      for(var i=0;i<entityLen;i++){
        entities[i].then(function(value){
          if(!setFlag){setFlag=true;res(value);}
        }).catch(function(reason){
          if(!setFlag){setFlag=true;rej(reason);}
        });
      }
    });
    return racePromise;
  }; 
  //export the constructor
  if(typeof module != 'undefined' && module.exports) module.exports = Promise;
  else if(typeof define ==='function' && define.amd) define(Promise); 
  else root.Promise = Promise;
})(window);