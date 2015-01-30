    /*
    author:wengeezhang;
    version:1.0;
    
    prototype:then
    public static member:alreadyThenContinue
    principle 1：every promise in a chain can't be replaced considering correct referring
    principle 2：one promise only one fullfil/rejecResult,but can have an array of fullfil/rejecFun or subPromise
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
                that.constructor.alreadyThenContinue(that.alreadyEquPro,that.alreadyEquPro.fullfilFunArr,e);
              }
            }else{
              if(that.subPromiseArr.length){
                that.constructor.alreadyThenContinue(that,that.fullfilFunArr,e);
              };
            }
        }, function(e) {
            that.state = "rejected";
            that.rejectResult = e;
            that.executed = true;
            if(that.alreadyEquPro){//只有then，且不是链条最后一个then中产生的promise，才可能有alreadyEquPro。
              if(that.alreadyEquPro.subPromiseArr.length){
                that.constructor.alreadyThenContinue(that.alreadyEquPro,that.alreadyEquPro.rejectFunArr,e);
              }else{
                that.alreadyEquPro.rejectResult=e;
                that.alreadyEquPro.state="rejected";
                that.alreadyEquPro.executed=true;
              }
            }else{
              if(that.subPromiseArr.length){
                that.constructor.alreadyThenContinue(that,that.rejectFunArr,e);
              };
            }
        });
    };
    mPromise.alreadyThenContinue=function(thenCalledPro,thenArguFunArr,thatResult){//之前的ThenExec
      var result,thenGenePro;
      for(var i=0;i<thenCalledPro.subPromiseArr.length;i++){
          result=thenArguFunArr[i](thatResult);
          if(result instanceof thenCalledPro.constructor){
            //进到这里，thenCalledPro.subPromiseArr[i]的执行肯定被延时啦
            thenGenePro=result;
            thenGenePro.alreadyEquPro=thenCalledPro.subPromiseArr[i];
            //等到thenGenePro执行的时候，大致跟下面的else执行的任务一样。
          }else{
            thenGenePro=new thenCalledPro.constructor(function(fFlagFun){
                    fFlagFun(result);
                });
            //上面产生的thenGenePro，在初始化中，没走executor中的if else的任何逻辑。
            thenCalledPro.subPromiseArr[i].fullfilResult=thenGenePro.fullfilResult;
            thenCalledPro.subPromiseArr[i].executor=thenGenePro.executor;
            thenCalledPro.subPromiseArr[i].state="fullfiled";
            thenCalledPro.subPromiseArr[i].executed=true;
            //既然进到else，that.subPromiseArr就是同步的，需要检测链条中后续是否还有then调用，故状态一定是fullfiled
            if(thenCalledPro.subPromiseArr[i].subPromiseArr.length){
              //that.subPromiseArr.then(cachesubPromiseArr.fullfilFunArr,cachesubPromiseArr.rejectFunArr);//不要二次调用then；其实进入到then后，还是执行thenExec
              thenCalledPro.constructor.alreadyThenContinue(thenCalledPro.subPromiseArr[i],thenCalledPro.subPromiseArr[i].fullfilFunArr,result);
            }
          }
      }
    }
    mPromise.prototype.then = function(f, r) {
        this.fullfilFunArr.push(f || null);
        this.rejectFunArr.push(r || null);
        //1.设置链式子代-start
        //--promise has been defered  只需判断this.executed即可
        var result,thenGenePro;
        if(!this.executed){
          thenGenePro=new mPromise();
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
            result=this.fullfilFunArr.pop()(this.fullfilResult);
          }else{
            result=this.rejectFunArr.pop()(this.rejectResult);
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