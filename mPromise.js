    function mPromise(executor) {
        this.executed = false;
        this.state = "pending";
        this.fullfilFun = null;
        this.rejectFun = null;
        this.fullfilResult = null;
        this.rejectResult = null;
        this.subPromise = null;
        this.returnedToVar=null;
        this.protoThenCalled=false;
        this.executor = executor || null;
        if (this.executor == null) {
            return;
        };
        var that = this;
        this.executor(function(e) {
            that.state = "fullfiled";
            that.fullfilResult = e;
            that.executed = true;
            if(that.returnedToVar){//deferred promise（后面无then）的善尾工作
              that.returnedToVar.state="fullfiled";
              that.returnedToVar.fullfilResult = e;
              that.returnedToVar.executed = true;
              if(that.returnedToVar.subPromise){//check again whether returnedToVar calls then
                that.returnedToVar.then(that.returnedToVar.fullfilFun,that.returnedToVar.rejectFun);
              }
            }
            if(that.subPromise){
              that.constructor.thenExec(that,that.fullfilFun,that.fullfilResult);
            }
        }, function(e) {
            that.state = "rejected";
            that.rejectResult = e;
            that.executed = true;
            if(that.returnedToVar){//deferred promise（后面无then）的善尾工作
              that.returnedToVar.state="rejected";
              that.returnedToVar.rejectResult = e;
              that.returnedToVar.executed = true;
              if(that.returnedToVar.subPromise){//再次检测这中间等待时，外面的变量var有无then调用
                that.returnedToVar.then(that.returnedToVar.fullfilFun,that.returnedToVar.rejectFun);
              }
            }
            if(that.subPromise){
              that.constructor.thenExec(that,that.rejectFun,that.rejectResult);
            }
        });
    };
    mPromise.thenExec=function(that,thenArguFun,thatResult){
      var result,cacheSubPromise=that.subPromise;
      result=thenArguFun(thatResult);
      if(result instanceof that.constructor){
        that.subPromise=result;
        that.subPromise.fullfilFun=cacheSubPromise.fullfilFun;
        that.subPromise.rejectFun=cacheSubPromise.rejectFun;
        that.subPromise.subPromise=cacheSubPromise.subPromise;
        if(!that.subPromise.subPromise){
          that.subPromise.returnedToVar=cacheSubPromise;
        }
      }else{
        that.subPromise=new that.constructor(function(fFlagFun){
                fFlagFun(result);
            });
        that.subPromise.subPromise=cacheSubPromise.subPromise;
        if(that.subPromise.subPromise){
          that.subPromise.then(cacheSubPromise.fullfilFun,cacheSubPromise.rejectFun);
        }else{
          cacheSubPromise.state=that.subPromise.state;
          cacheSubPromise.fullfilResult=that.subPromise.fullfilResult;
          cacheSubPromise.rejectResult=that.subPromise.rejectResult;
          cacheSubPromise.executed=true;
          that.subPromise.returnedToVar=cacheSubPromise;
        }
      }
    }
    mPromise.prototype.then = function(f, r) {
        this.fullfilFun = f || null;
        this.rejectFun = r || null;
        this.protoThenCalled=true;
        //1.设置链式子代-start
        //--promise has been defered  只需判断this.executed即可
        if(!this.executed){
          this.subPromise=new mPromise();
          return this.subPromise;
        }
        //设置链式子代-end

        //2.then代码块
        //执行then代码块--start
        if(!this.subPromise || this.protoThenCalled){//进入到此处，且子代为null,那么直接返回即可。或者开启第二个链式
          var result;
          if(this.state=="fullfiled"){
            result=this.fullfilFun(this.fullfilResult);
          }else{
            result=this.rejectFun(this.rejectResult);
          }
          if(result instanceof this.constructor){
            this.subPromise=result;
          }else{
            this.subPromise=new this.constructor(function(fFlagFun){
                    fFlagFun(result);
                });
          }
          return this.subPromise;//
        }else{
          if(this.state=="fullfiled"){
            this.constructor.thenExec(this,this.fullfilFun,this.fullfilResult);
          }else{
            this.constructor.thenExec(this,this.rejectFun,this.rejectResult);
          }
        }
        //执行then代码块--end
    }