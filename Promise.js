    /*
    author:wengeezhang;
    version:1.6;
    updated 2015/6/11
    update:Promise.all,when one rejected,break loop

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

    ************
    principle 1£º every promise in a chain can't be replaced considering correct referring
    principle 2£º one promise can have only one fullfilResult/rejectResult,but can have an array of fullfilFuns/rejecFuns or subPromises
    It's meanless but throw no error:var a=new Promise(function(res,rej){res("wai");return new Promise(function(res,rej){res("nei");})})
    
    ************
    bug1:
        then()'s return--promise chain;
        var a=x_promise.then(function(value){
              return y_promise.then(function(){/ajax process/});
        })
        a.then()
    */
    function Promise(executor) {
        this.executed = false;
        this.state = "pending";
        this.fullfilFunArr = [];
        this.rejectFunArr = [];
        this.result = null;//only one-resolved/rejected
        this.subPromiseArr = [];
        this.placeholder=null;
        if(!executor){//can aslo add '||typeof executor != "function"'
          return;
        }
        var that = this,that_placeholder;
        //private functions:_airCheck,_execThenOf,_resrej
        function _airCheck(promise_air,state){
          if(promise_air.placeholder){
            //promise_air may be then end of a chain which is returned inside a <then>
            //so that_placeholder becomes a promise_air
            promise_air.placeholder.result=promise_air.result;
            promise_air.placeholder.state=state;
            promise_air.placeholder.executed=true;
            if(promise_air.placeholder.subPromiseArr.length){
              _execThenOf(promise_air.placeholder);
            }
          }
        }
        function _execThenOf(thenCalledPro){
           //thenCalledPro:promise calling "then"
          var result,thenGenePro,thenArguFunArr,supResult;
          var promise_Holder,promise_air;
          var subPromiseLen,curSubPromise;
          if(thenCalledPro.state=="resolved"){
            thenArguFunArr=thenCalledPro.fullfilFunArr;
          }else{
            thenArguFunArr=thenCalledPro.rejectFunArr;
          }
          supResult=thenCalledPro.result;

          subPromiseLen=thenCalledPro.subPromiseArr.length;
          for(var i=0;i<subPromiseLen;i++){
              curSubPromise=thenCalledPro.subPromiseArr[i];
              if(thenArguFunArr[i]===null){//directly inherit supPromise's info
                curSubPromise.state=thenCalledPro.state;
                curSubPromise.executed=true;
                curSubPromise.result=thenCalledPro.result;
                if(thenCalledPro.state=="resolved"){
                  //below fixes bug1£º
                  _airCheck(curSubPromise,"resolved");//curSubPromise may become a promise_air
                }else{
                  //bolow fixes bug1:
                  _airCheck(curSubPromise,"rejected");//curSubPromise may become a promise_air
                }
              }else{
                result=thenArguFunArr[i](supResult);
                if(result instanceof thenCalledPro.constructor){
                  promise_air=result;
                  promise_Holder=curSubPromise;
                  promise_air.placeholder=promise_Holder;
                  if(promise_air.executed){//like this:new Promise(function(res){res("ss")})
                    if(promise_air.state=="resolved"){
                      promise_Holder.state="resolved";
                    }else{
                      promise_Holder.state="rejected";
                    }
                    promise_Holder.result=promise_air.result;
                    promise_Holder.executed=true;
                  }
                }else{
                  //must be resolved
                  curSubPromise.result=result;
                  curSubPromise.state="resolved";
                  curSubPromise.executed=true;
                  //below fixes bug1:
                  _airCheck(curSubPromise,"resolved");//curSubPromise may become a promise_air
                }
              }
          }
          for(var j=0;j<subPromiseLen;j++){
            curSubPromise=thenCalledPro.subPromiseArr[j];
            if(curSubPromise.executed){
              if(curSubPromise.subPromiseArr.length){
                _execThenOf(curSubPromise);
              }
            }//else:result instanceof Promise,so it's then will be called in the future.
          }
        }
        function _resrej(result,state){
          that.state = state;
          that.result = result;
          that.executed = true;
          if(that.placeholder){
            that_placeholder=that.placeholder;
            that_placeholder.result=result;
            that_placeholder.state=state;
            that_placeholder.executed=true;
            if(that_placeholder.subPromiseArr.length){//looks forward 
              _execThenOf(that_placeholder);
            }
            //below fixes bug1:
            _airCheck(that_placeholder,state);
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

        var result,thenGenePro,upperArgFun;
        //defered --start
        if(!this.executed){
          thenGenePro=new this.constructor();
          this.subPromiseArr.push(thenGenePro);//async,we call this empty promise "promise_Holder".
          return thenGenePro;
        }
        //defered --end

        if(this.state=="resolved"){
          if(this.result && typeof this.result.then == "function"){//resolve(thenable)
            this.result.then(f);
            return new this.constructor();
          }
          upperArgFun=this.fullfilFunArr.pop();
          if(upperArgFun===null){
            thenGenePro=new this.constructor();
            thenGenePro.state="resolved";
            thenGenePro.executed=true;
            thenGenePro.result=this.result;
            return thenGenePro;
          }else{
            result=upperArgFun(this.result);
          }
        }else{
          upperArgFun=this.rejectFunArr.pop();
          if(upperArgFun===null){
            thenGenePro=new this.constructor();
            thenGenePro.executed=true;
            thenGenePro.state="rejected";
            thenGenePro.result=this.result;
            return thenGenePro;
          }else{
            result=upperArgFun(this.result);
          }
        }
        if(result instanceof this.constructor){
          thenGenePro=result;
        }else{
          thenGenePro=new this.constructor(function(fFlagFun){
                  fFlagFun(result);
              });
        }
        this.subPromiseArr.push(thenGenePro);
        return thenGenePro;//
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