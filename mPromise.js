    /*
    author:wengeezhang;
    version:1.0;
    
    prototype:then
    public static member:execThenOf
    principle 1：every promise in a chain can't be replaced considering correct referring
    principle 2：one promise only one fullfil/rejectResult,but can have an array of fullfil/rejecFun or subPromise
    */
    function mPromise(executor) {
        this.executed = false;
        this.state = "pending";
        this.fullfilFunArr = [];
        this.rejectFunArr = [];
        //fullfilResult是当前promise的运行结果，只有一个。
        //即先有fullfilResult，然后再分发给fullfilFunArrArr
        this.fullfilResult = null;
        this.rejectResult = null;
        this.subPromiseArr = [];
        this.alreadyEquPro=null;
        this.executor = executor || null;
        if (this.executor == null) {
            return;
        }
        var that = this;
        this.executor(function(e) {
            that.state = "fullfiled";
            that.fullfilResult = e;
            that.executed = true;
            if(that.alreadyEquPro){//只有then，且不是链条最后一个then中产生的promise，才可能有alreadyEquPro。
              that.alreadyEquPro.fullfilResult=e;
              that.alreadyEquPro.executor=that.executor;
              that.alreadyEquPro.state="fullfiled";
              that.alreadyEquPro.executed=true;
              if(that.alreadyEquPro.subPromiseArr.length){
                that.constructor.execThenOf(that.alreadyEquPro);
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
            if(that.alreadyEquPro){//只有then，且不是链条最后一个then中产生的promise，才可能有alreadyEquPro。
              if(that.alreadyEquPro.subPromiseArr.length){
                that.constructor.execThenOf(that.alreadyEquPro);
              }else{
                that.alreadyEquPro.rejectResult=e;
                that.alreadyEquPro.state="rejected";
                that.alreadyEquPro.executed=true;
              }
            }else{
              if(that.subPromiseArr.length){
                that.constructor.execThenOf(that);
              };
            }
        });
    };
    mPromise.execThenOf=function(thenCalledPro){//之前的ThenExec
      //thenCalledPro:promise that called "then"
      var result,thenGenePro,thenArguFunArr,supResult;
      if(thenCalledPro.state=="fullfiled"){
        thenArguFunArr=thenCalledPro.fullfilFunArr;
        supResult=thenCalledPro.fullfilResult;
      }else{
        thenArguFunArr=thenCalledPro.rejectFunArr;
        supResult=thenCalledPro.rejectResult;
      };
      for(var i=0;i<thenCalledPro.subPromiseArr.length;i++){
          if(thenArguFunArr[i]==null){
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
          result=thenArguFunArr[i](supResult);
          if(result instanceof thenCalledPro.constructor){
            //进到这里，thenCalledPro.subPromiseArr[i]的执行肯定被延时啦
            thenGenePro=result;
            thenGenePro.alreadyEquPro=thenCalledPro.subPromiseArr[i];
            //等到thenGenePro执行的时候，大致跟下面的else执行的任务一样。
          }else{
            thenCalledPro.subPromiseArr[i].fullfilResult=result;
            thenCalledPro.subPromiseArr[i].state="fullfiled";
            thenCalledPro.subPromiseArr[i].executed=true;
            //既然进到else，that.subPromiseArr就是同步的，需要检测链条中后续是否还有then调用，故状态一定是fullfiled
            if(thenCalledPro.subPromiseArr[i].subPromiseArr.length){
              //that.subPromiseArr.then(cachesubPromiseArr.fullfilFunArr,cachesubPromiseArr.rejectFunArr);//不要二次调用then；其实进入到then后，还是执行thenExec
              thenCalledPro.constructor.execThenOf(thenCalledPro.subPromiseArr[i]);
            }
          }
      }
    }
    mPromise.prototype.then = function(f, r) {
        this.fullfilFunArr.push(f || null);
        this.rejectFunArr.push(r || null);
        //1.设置链式子代-start
        //--promise has been defered  只需判断this.executed即可
        var result,thenGenePro,upperArgFun;
        if(!this.executed){
          thenGenePro=new this.constructor();
          this.subPromiseArr.push(thenGenePro);
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
    mPromise.prototype.catch=function(callback){
      return this.then(null,callback);
    }
    //static methods
    mPromise.resolve=function(value){
      if(value && value.constructor==mPromise){
        return value;
      }
      return new mPromise(function(res,rej){res(value);});
    }
    mPromise.reject=function(reason){
      return new mPromise(function(res,rej){rej(reason);});
    }
    mPromise.all=function(entries){
      var allPromise = new mPromise(function(res,rej){
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
    mPromise.race=function(entries){
      var racePromise = new mPromise(function(res,rej){
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