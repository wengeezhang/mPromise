/*
** version
author:wengeezhang;
version:2.1;
updated 2015/10/08
update:annotations
************

** interface
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

** principles
1.every promise in a chain can't be replaced considering correct referring
2.one promise can have only one fullfilResult/rejectResult,but can have an array of fullfilFuns/rejecFuns or subPromises
It's meanless but throw no error:var a=new Promise(function(res,rej){res("wai");return new Promise(function(res,rej){res("nei");})})
************

** code model
* when promise's finished,always use "ship" to resume tasks of the chain
* _placeholder_subprosCheck function do two things:1.check _placeholder;2.check subpros;
************

** bug1:
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
  };
  function _placeholder_subprosCheck(promise_holder){//the only aim:check subPromise exist
    //1.check placeholder
    if(promise_holder.placeholder){
      _ship(promise_holder.placeholder,promise_holder.result,promise_holder.state);
    };
    if(promise_holder.subPromiseArr.length){
      _execThenOf(promise_holder);
    }; 
  };  
  function _thenCallback_Exec(promise_holder,fatherPro){
    //then's callback执行前，首先要对fatherPro的result检测，看是否为thenable
    //而不是检测thenCb()的运行结果，thenCb的不用检查，要等到它的下一次then时再检测
    var supResult,thenCb;
    //select thenCb,supResult
    supResult = fatherPro.result;
    if(fatherPro.state == 'resolved'){
      thenCb=promise_holder.fullfilFun;
    }else{
      thenCb=promise_holder.rejectFun;
    }
    //check thenCb null
    if(typeof thenCb != 'function'){//延续祖辈的结果和状态
      _ship(promise_holder,supResult,fatherPro.state);
      return;
    }
    pro_air=thenCb(supResult);
    if(pro_air instanceof promise_holder.constructor){
      pro_air.placeholder=promise_holder;//do not delete:return chain
      if(pro_air.state != 'pending'){
        _ship(promise_holder,pro_air.result,pro_air.state);
      }
    }else{//pro_air is string/object/thenable
      _ship(promise_holder,pro_air,'resolved');
    }
  } 
  function _ship(promise_holder,result,state){
    promise_holder.state=state;
    promise_holder.result=result;
    _placeholder_subprosCheck(promise_holder);
  }
  function _execThenCb(thenCalledPro,sync){
     //thenCalledPro:promise calling "then"
    var thenCbArr,promise_holder;
    var supResult = thenCalledPro.result;
    if(supResult && typeof supResult.then == 'function' && !(supResult instanceof thenCalledPro.constructor)){
      if(!thenCalledPro.resrej || thenCalledPro.state == 'resolved'){
        var then_promise = new thenCalledPro.constructor(supResult.then);
        then_promise.placeholder = thenCalledPro;
        if(then_promise.state != 'pending'){
          _ship(thenCalledPro,then_promise.result,then_promise.state);
        }
        return;
      }
    };
    //supResult:string/obj/(rej(thenable))
    for(var i=0,len=thenCalledPro.subPromiseArr.length;i<len;i++){
        promise_holder=thenCalledPro.subPromiseArr[i];
        _thenCallback_Exec(promise_holder,thenCalledPro);
    };

    thenCalledPro.subPromiseArr=[];
  }
  function _execThenOf(thenCalledPro){//async then calling
    _microDefer(null,_execThenCb,[thenCalledPro,0]);
  }
  function _microThen(thisArg,f,r){//sync then calling
    var promise_holder=new thisArg.constructor(),pro_air;
    promise_holder.fullfilFun = f;
    promise_holder.rejectFun = r;
    thisArg.subPromiseArr.push(promise_holder);
    _microDefer(null,_execThenCb,[thisArg,1]);
    return promise_holder;//
  }
  function Promise(executor) {
      this.state = "pending";
      this.result = null;//only one-resolved/rejected
      this.subPromiseArr = [];
      this.placeholder=null;
      if(!executor){//can aslo add '||typeof executor != "function"'
        return;
      };
      var that = this,that_placeholder; 
      function _resrej(result,state){
        //_ship(that,result,state);
        if(result instanceof that.constructor){
          result.placeholder=that;//do not delete:return chain
          if(state == 'rejected'){
            _ship(that,result,'rejected');
          }else if(state == 'resolved'){
            _ship(that,result.result,result.state);
          };
        }else if(result && typeof result.then == 'function'){
          that.resrej = true;
          _ship(that,result,state);
        }else{//pro_air is string/object
          _ship(that,result,state);
        };
      };
      //entry point
      executor(function(e) {
          _resrej(e,"resolved");
      }, function(e) {
          _resrej(e,"rejected");
      });
  }
  Promise.prototype.then = function(f, r) {
      var result,thenGenePro;
      //async:wait and _microDefer;
      //sync:microDefer;
      if(this.state == 'pending'){
        thenGenePro=new this.constructor();
        thenGenePro.fullfilFun = f;
        thenGenePro.rejectFun = r;
        this.subPromiseArr.push(thenGenePro);//async,we call this empty promise "promise_Holder".
        return thenGenePro;
      }else{
        return _microThen(this,f,r);
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