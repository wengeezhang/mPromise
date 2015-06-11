    /*
    author:wengeezhang;
    version:1.5;
    updated 2015/6/11

    ************
    prototype:     then,catch
    static method: all,race,resolve,reject

    ************
    ** EXAMPLE
    x_promise.then(F1,F2).then(F3,F4).[---].then(Fm,Fm).
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
        this.fullfilResult = null;//only one
        this.rejectResult = null;//only one
        this.subPromiseArr = [];
        this.placeholder=null;
        this.executor = executor || null;
        if (this.executor == null) {
            return;
        }
        var that = this,that_placeholder;
        this.executor(function(e) {
            that.state = "resolved";
            that.fullfilResult = e;
            that.executed = true;
            if(that.placeholder){
              that_placeholder=that.placeholder;
              that_placeholder.fullfilResult=e;
              that_placeholder.state="resolved";
              that_placeholder.executed=true;
              if(that_placeholder.subPromiseArr.length){//looks forward 
                that.constructor.execThenOf(that_placeholder);
              }
              //below fixes bug1:
              if(that_placeholder.placeholder){
                //that_placeholder was end of chain,and the chain is returned inside a <then>
                //so that_placeholder becomes a promise_air
                that_placeholder.placeholder.fullfilResult=e;
                that_placeholder.placeholder.state="resolved";
                that_placeholder.placeholder.executed=true;
                if(that_placeholder.placeholder.subPromiseArr.length){
                  that.constructor.execThenOf(that_placeholder.placeholder);
                }
              }
            }else{
              if(that.subPromiseArr.length){
                that.constructor.execThenOf(that);
              };
            }
        }, function(e) {
            that.state = "rejected";
            that.rejectResult = e;
            that.executed = true;
            if(that.placeholder){//
              that_placeholder=that.placeholder;
              that_placeholder.rejectResult=e;
              that_placeholder.state="rejected";
              that_placeholder.executed=true;
              if(that_placeholder.subPromiseArr.length){
                that.constructor.execThenOf(that_placeholder);
              }
              if(that_placeholder.placeholder){
                that_placeholder.placeholder.fullfilResult=e;
                that_placeholder.placeholder.state="rejected";
                that_placeholder.placeholder.executed=true;
                if(that_placeholder.placeholder.subPromiseArr.length){
                  that.constructor.execThenOf(that_placeholder.placeholder);
                }
              }
            }else{
              if(that.subPromiseArr.length){
                that.constructor.execThenOf(that);
              };
            }
        });
    };
    Promise.execThenOf=function(thenCalledPro){//preceding ThenExec
      //thenCalledPro:promise calling "then"
      var result,thenGenePro,thenArguFunArr,supResult;
      var promise_Holder,promise_air;
      var subPromiseLen,curSubPromise;
      if(thenCalledPro.state=="resolved"){
        thenArguFunArr=thenCalledPro.fullfilFunArr;
        supResult=thenCalledPro.fullfilResult;
      }else{
        thenArguFunArr=thenCalledPro.rejectFunArr;
        supResult=thenCalledPro.rejectResult;
      };
      subPromiseLen=thenCalledPro.subPromiseArr.length;
      for(var i=0;i<subPromiseLen;i++){
          curSubPromise=thenCalledPro.subPromiseArr[i];
          if(thenArguFunArr[i]==null){//directly inherit supPromise's info
            curSubPromise.state=thenCalledPro.state;
            curSubPromise.executed=true;
            if(thenCalledPro.state=="resolved"){
              curSubPromise.fullfilResult=thenCalledPro.fullfilResult;
              //below fixes bug1£º
              if(curSubPromise.placeholder){
                //curSubPromise may be then end of a chain which is returned inside a <then>
                curSubPromise.placeholder.fullfilResult=curSubPromise.fullfilResult;
                curSubPromise.placeholder.state="resolved";
                curSubPromise.placeholder.executed=true;
                if(curSubPromise.placeholder.subPromiseArr.length){
                  curSubPromise.constructor.execThenOf(curSubPromise.placeholder);
                }
              }
            }else{
              curSubPromise.rejectResult=thenCalledPro.rejectResult;
              //bolow fixes bug1:
              if(curSubPromise.placeholder){
                curSubPromise.placeholder.rejectResult=curSubPromise.rejectResult;
                curSubPromise.placeholder.state="rejected";
                curSubPromise.placeholder.executed=true;
                if(curSubPromise.placeholder.subPromiseArr.length){
                  curSubPromise.constructor.execThenOf(curSubPromise.placeholder);
                }
              }
            }
          }else{
            result=thenArguFunArr[i](supResult);
            if(result instanceof thenCalledPro.constructor){
              promise_air=result;
              promise_Holder=curSubPromise;
              promise_air.placeholder=promise_Holder;
              if(promise_air.executed){//like this:new Promise(function(res){res("ss")})
                if(promise_air.state=="resolved"){
                  promise_Holder.fullfilResult=promise_air.fullfilResult;
                  promise_Holder.state="resolved";
                }else{
                  promise_Holder.rejectResult=promise_air.rejectResult;
                  promise_Holder.state="rejected";
                }
                promise_Holder.executed=true;
                
              }
            }else{
              //must be resolved
              curSubPromise.fullfilResult=result;
              curSubPromise.state="resolved";
              curSubPromise.executed=true;
              //below fixes bug1:
              if(curSubPromise.placeholder){
                curSubPromise.placeholder.fullfilResult=result;
                curSubPromise.placeholder.state="resolved";
                curSubPromise.placeholder.executed=true;
                if(curSubPromise.placeholder.subPromiseArr.length){
                  curSubPromise.constructor.execThenOf(curSubPromise.placeholder);
                }
              }
            }
          }
      }
      for(var j=0;j<subPromiseLen;j++){
        curSubPromise=thenCalledPro.subPromiseArr[j];
        if(curSubPromise.executed){
          if(curSubPromise.subPromiseArr.length){
            thenCalledPro.constructor.execThenOf(curSubPromise);
          }
        }//else:result instanceof Promise,so it's then will be called in the future.
      }
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
          if(this.fullfilResult && typeof this.fullfilResult.then == "function"){//resolve(thenable)
            this.fullfilResult.then(f);
            return new this.constructor();
          }
          upperArgFun=this.fullfilFunArr.pop();
          if(upperArgFun==null){
            thenGenePro=new this.constructor();
            thenGenePro.state="resolved";
            thenGenePro.executed=true;
            thenGenePro.fullfilResult=this.fullfilResult;
            return thenGenePro;
          }else{
            result=upperArgFun(this.fullfilResult);
          }
        }else{
          upperArgFun=this.rejectFunArr.pop();
          if(upperArgFun==null){
            thenGenePro=new this.constructor();
            thenGenePro.executed=true;
            thenGenePro.state="rejected";
            thenGenePro.rejectResult=this.rejectResult;
            return thenGenePro;
          }else{
            result=upperArgFun(this.rejectResult);
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
    }
    Promise.prototype.catch=function(callback){
      return this.then(null,callback);
    }
    //static methods
    Promise.resolve=function(value){
      if(value && typeof value=="object" && value.constructor==Promise){//Promise instance
        return value;
      }
      return new Promise(function(res,rej){res(value);});//thenable obj or others
    }
    Promise.reject=function(reason){
      return new Promise(function(res,rej){rej(reason);});
    }
    Promise.all=function(entries){
      var allPromise = new Promise(function(res,rej){
        var entryLen=entries.length;
        var fullfilmentArr=[],rejectFlag=false,entriesResNum=0;
        for(var i=0;i<entryLen;i++){
          function lcFun(n){
            entries[n].then(function(value){
              if(!rejectFlag){
                entriesResNum+=1;
                fullfilmentArr[n]=value;
                if(entriesResNum==entryLen){
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
    }
    Promise.race=function(entries){
      var racePromise = new Promise(function(res,rej){
        var entryLen=entries.length,setFlag=false;
        for(var i=0;i<entryLen;i++){
          entries[i].then(function(value){
            if(!setFlag){setFlag=true;res(value);}
          }).catch(function(reason){
            if(!setFlag){setFlag=true;rej(reason);}
          });
        }
      });
      return racePromise;
    }