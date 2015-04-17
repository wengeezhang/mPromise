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
    principle 1：every promise in a chain can't be replaced considering correct referring
    principle 2：one promise can have only one fullfilResult/rejectResult,but can have an array of fullfilFuns/rejecFuns or subPromises
    It's meanless but throw no error:var a=new Promise(function(res,rej){res("wai");return new Promise(function(res,rej){res("nei");})})
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
            that.state = "fullfiled";
            that.fullfilResult = e;
            that.executed = true;
            if(that.placeholder){//只有then，且不是链条最后一个then中产生的promise，才可能有placeholder。
              that_placeholder=that.placeholder;
              that_placeholder.fullfilResult=e;
              that_placeholder.executor=that.executor;
              that_placeholder.state="fullfiled";
              that_placeholder.executed=true;
              if(that_placeholder.subPromiseArr.length){
                that.constructor.execThenOf(that_placeholder);
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
              that_placeholder.executor=that.executor;
              that_placeholder.state="rejected";
              that_placeholder.executed=true;
              if(that_placeholder.subPromiseArr.length){
                that.constructor.execThenOf(that_placeholder);
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
      if(thenCalledPro.state=="fullfiled"){
        thenArguFunArr=thenCalledPro.fullfilFunArr;
        supResult=thenCalledPro.fullfilResult;
      }else{
        thenArguFunArr=thenCalledPro.rejectFunArr;
        supResult=thenCalledPro.rejectResult;
      };
      for(var i=0;i<thenCalledPro.subPromiseArr.length;i++){
          if(thenArguFunArr[i]==null){//directly inherit supPromise's info
            if(thenCalledPro.state=="fullfiled"){
              thenCalledPro.subPromiseArr[i].fullfilResult=thenCalledPro.fullfilResult;
            }else{
              thenCalledPro.subPromiseArr[i].rejectResult=thenCalledPro.rejectResult;
            }
            thenCalledPro.subPromiseArr[i].state=thenCalledPro.state;
            thenCalledPro.subPromiseArr[i].executed=true;
            if(thenCalledPro.subPromiseArr[i].subPromiseArr.length){
              thenCalledPro.constructor.execThenOf(thenCalledPro.subPromiseArr[i]);
            }
            return;
          }
          //ship promise_air's info-START
          result=thenArguFunArr[i](supResult);
          if(result instanceof thenCalledPro.constructor){
            promise_air=result;
            promise_Holder=thenCalledPro.subPromiseArr[i];
            promise_air.placeholder=promise_Holder;
            if(promise_air.executed){//then的参数函数返回如下：new Promise(function(res){res("ss")})
              if(promise_air.state=="fullfiled"){
                promise_Holder.fullfilResult=promise_air.fullfilResult;
                promise_Holder.state="fullfiled";
              }else{
                promise_Holder.rejectResult=promise_air.rejectResult;
                promise_Holder.state="rejected";
              }
              promise_Holder.executor=promise_air.executor;
              promise_Holder.executed=true;
              if(promise_Holder.subPromiseArr.length){
                thenCalledPro.constructor.execThenOf(promise_Holder);
              }
            }//else情形下，将会在未来执行（构造函数内部的代码）setTimeout(,0) belongs to this
            //等到thenGenePro执行的时候，大致跟下面的else执行的任务一样。
            //bug:如果result是同步的（new Promise(function(res){res("ss")})），那么在设置thenGenePro.placeholder以前，构造函数内部的executor已经执行完了。
          }else{
            //then的参数函数返回普通数据，如return "ok";所以state一定是fullfiled,没有rejected
            thenCalledPro.subPromiseArr[i].fullfilResult=result;
            thenCalledPro.subPromiseArr[i].state="fullfiled";
            thenCalledPro.subPromiseArr[i].executed=true;
            //既然进到else，that.subPromiseArr[i]就是同步的，需要检测链条中后续是否还有then调用，故状态一定是fullfiled
            if(thenCalledPro.subPromiseArr[i].subPromiseArr.length){
              //that.subPromiseArr.then(cachesubPromiseArr.fullfilFunArr,cachesubPromiseArr.rejectFunArr);//不要二次调用then；其实进入到then后，还是执行thenExec
              thenCalledPro.constructor.execThenOf(thenCalledPro.subPromiseArr[i]);
            }
          }
          //ship promise_air's info-END
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
          if(this.state=="fullfiled"){
            if(this.fullfilResult && typeof this.fullfilResult.then == "function"){//resole(thenable)
              this.fullfilResult.then(f);
              return new this.constructor();
            }
            upperArgFun=this.fullfilFunArr.pop();
            if(upperArgFun==null){
              thenGenePro=new this.constructor();
              thenGenePro.state="fullfiled";
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
          if(this.state=="fullfiled"){
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
          entries[i].then(function(value){
            if(!rejectFlag){
              entriesResNum+=1;
              fullfilmentArr.push(value);
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