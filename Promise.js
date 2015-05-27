    /*
    author:wengeezhang;
    version:1.0;

    ************
    prototype:     then,catch
    static method: all,race,resolve,reject

    ************
    Example Analysis:
    x_promise.then(F1,F2).then(F3,F4).[---].then(Fm,Fm).
    
    x_promise:      a promise which is async.
    chain:          promise(x_promise)->promise(F1/2)->promise(F3/4)...->promise(Fm/n)
    promise_Holder: an empty promise returned immediately by x_promise.then(F1,F2).In chain.
    promise_air:    a promise returned by F1/2();Not in chain.
    placeholder:    a property of promise_air.It refers to promise_Holder.
    
    promise_air.placeholder=promise_Holder.

    promise_Holder is in the chain and holds original information(subPromise) of the chain.
    promise_air isn't in chain,but it can self be executed in the future and will catch the result and state.
    finally,refresh promise_Holder's info with promise_air's. (bridge is placeholder)

    ************
    principle 1： every promise in a chain can't be replaced considering correct referring
    principle 2： one promise can have only one fullfilResult/rejectResult,but can have an array of fullfilFuns/rejecFuns or subPromises
    It's meanless but throw no error:var a=new Promise(function(res,rej){res("wai");return new Promise(function(res,rej){res("nei");})})
    
    ************
    bug1:then()'s return--promise chain;
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
            if(that.placeholder){//只有then，且不是链条最后一个then中产生的promise，才可能有placeholder。
              that_placeholder=that.placeholder;
              that_placeholder.fullfilResult=e;
              that_placeholder.state="resolved";
              that_placeholder.executed=true;
              if(that_placeholder.subPromiseArr.length){
                that.constructor.execThenOf(that_placeholder);
              }
              //以下解决bug1:
              if(that_placeholder.placeholder){
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
            if(that.placeholder){//只有then，且不是链条最后一个then中产生的promise，才可能有placeholder。
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
    Promise.execThenOf=function(thenCalledPro){//之前的ThenExec
      //thenCalledPro:promise that called "then"
      var result,thenGenePro,thenArguFunArr,supResult,promise_Holder,promise_air;
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
            if(thenCalledPro.state=="resolved"){
              curSubPromise.fullfilResult=thenCalledPro.fullfilResult;
            }else{
              curSubPromise.rejectResult=thenCalledPro.rejectResult;
            }
            curSubPromise.state=thenCalledPro.state;
            curSubPromise.executed=true;
          }else{
            result=thenArguFunArr[i](supResult);
            if(result instanceof thenCalledPro.constructor){
              promise_air=result;
              promise_Holder=curSubPromise;
              promise_air.placeholder=promise_Holder;
              if(promise_air.executed){//then的参数函数返回如下：new Promise(function(res){res("ss")})
                if(promise_air.state=="resolved"){
                  promise_Holder.fullfilResult=promise_air.fullfilResult;
                  promise_Holder.state="resolved";
                }else{
                  promise_Holder.rejectResult=promise_air.rejectResult;
                  promise_Holder.state="rejected";
                }
                promise_Holder.executed=true;
                
              }//else情形下，将会在未来执行（构造函数内部的代码）setTimeout(,0) belongs to this
              //等到thenGenePro执行的时候，大致跟下面的else执行的任务一样。
              //bug:如果result是同步的（new Promise(function(res){res("ss")})），那么在设置thenGenePro.placeholder以前，构造函数内部的executor已经执行完了。
            }else{
              //then的参数函数返回普通数据，如return "ok";所以state一定是resolved,没有rejected
              curSubPromise.fullfilResult=result;
              curSubPromise.state="resolved";
              curSubPromise.executed=true;
              //以下解决bug1:
              if(curSubPromise.placeholder){
                curSubPromise.placeholder.fullfilResult=result;
                curSubPromise.placeholder.state="resolved";
                curSubPromise.placeholder.executed=true;
                if(curSubPromise.placeholder.subPromiseArr.length){
                  curSubPromise.constructor.execThenOf(curSubPromise.placeholder);
                }
              }
              //既然进到else，that.subPromiseArr[i]就是同步的，需要检测链条中后续是否还有then调用，故状态一定是resolved
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
        //1.设置链式子代-start
        //--promise has been defered  只需判断this.executed即可
        var result,thenGenePro,upperArgFun;
        if(!this.executed){
          thenGenePro=new this.constructor();
          this.subPromiseArr.push(thenGenePro);//async,we call this empty promse "promise_Holder".
          return thenGenePro;
        }
        //设置链式子代-end

        //2.then代码块
        //执行then代码块--start
        //if(!this.subPromiseArr.length || this.protoThenCalled){//一个promise只能调用一个then；如果二次调用，则表明它开启了一个新链条
        //此if判断已不需要，肯定会进到if里面。因为综合发现，then只有一次调用，既然进到这里来，
          //a.肯定是已经执行完了，而且this.subPromiseArr=null 或者
          //b.同一个promise第二次调用；即a.then();a.then();
        //切记：过了1年，一个promise才再次调用then。（第二个链式开头的，如果this是同步的，属于此；如果是延时的，不属于此，它属于多个subPromiseArr广播）
        //可以暂时忽略此片段，它只是用于过了n年才调用的情形；
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
          /*}else{
          if(this.state=="resolved"){
            this.constructor.thenExec(this,this.fullfilFunArr,this.fullfilResult);
          }else{
            this.constructor.thenExec(this,this.rejectFunArr,this.rejectResult);
          }
        }*/
        //执行then代码块--end
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