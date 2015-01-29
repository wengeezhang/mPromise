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
            if(that.returnedToVar){//deferred promise��������then������β����
              that.returnedToVar.state="fullfiled";
              that.returnedToVar.fullfilResult = e;
              that.returnedToVar.executed = true;
              if(that.returnedToVar.subPromise){//check again whether returnedToVar calls then
                //that.returnedToVar.then(that.returnedToVar.fullfilFun,that.returnedToVar.rejectFun);//��Ҫ���ε���then����ʵ���뵽then�󣬻���ִ��thenExec
                that.constructor.thenExec(that.returnedToVar,that.returnedToVar.fullfilFun,that.returnedToVar.fullfilResult);
              }
            }
            if(that.subPromise){
              that.constructor.thenExec(that,that.fullfilFun,that.fullfilResult);
            }
        }, function(e) {
            that.state = "rejected";
            that.rejectResult = e;
            that.executed = true;
            if(that.returnedToVar){//deferred promise��������then������β����
              that.returnedToVar.state="rejected";
              that.returnedToVar.rejectResult = e;
              that.returnedToVar.executed = true;
              if(that.returnedToVar.subPromise){//�ٴμ�����м�ȴ�ʱ������ı���var����then����
                that.constructor.thenExec(that.returnedToVar,that.returnedToVar.rejectFun,that.returnedToVar.rejectResult);
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
        //1.fullfilResult/rejectResult(�Զ�)��2.fullfilFun/rejectFun;3.subPromise����
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
        that.subPromise.fullfilFun=cacheSubPromise.fullfilFun;
        that.subPromise.rejectFun=cacheSubPromise.rejectFun;
        that.subPromise.subPromise=cacheSubPromise.subPromise;
        //��Ȼ����else��that.subPromise����ͬ���ģ���Ҫ��������к����Ƿ���then���ã���״̬һ����fullfiled
        if(that.subPromise.subPromise){
          //that.subPromise.then(cacheSubPromise.fullfilFun,cacheSubPromise.rejectFun);//��Ҫ���ε���then����ʵ���뵽then�󣬻���ִ��thenExec
          that.constructor.thenExec(that.subPromise,that.subPromise.fullfilFun,that.subPromise.fullfilResult);
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
        //1.������ʽ�Ӵ�-start
        //--promise has been defered  ֻ���ж�this.executed����
        if(!this.executed){
          this.subPromise=new mPromise();
          return this.subPromise;
        }
        //������ʽ�Ӵ�-end

        //2.then�����
        //ִ��then�����--start
        if(!this.subPromise || this.protoThenCalled){//һ��promiseֻ�ܵ���һ��then��������ε��ã��������������һ��������
        //�мǣ�����1�꣬һ��promise���ٴε���then�����ڶ�����ʽ��ͷ�ģ����this��ͬ���ģ����ڴˣ��������ʱ�ģ������ڴˣ������ڶ��subPromise�㲥��
        //������ʱ���Դ�Ƭ�Σ���ֻ�����ڹ���n��ŵ��õ����Σ�
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
        //ִ��then�����--end
    }