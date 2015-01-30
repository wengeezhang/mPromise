    function mPromise(executor) {
        this.executed = false;
        this.state = "pending";
        this.fullfilFunArr = [];
        this.rejectFunArr = [];
        //fullfilResult�ǵ�ǰpromise�����н����ֻ��һ����
        //������fullfilResult��Ȼ���ٷַ���fullfilFunArrArr
        this.fullfilResult = null;
        this.rejectResult = null;
        this.subPromiseArr = [];
        this.alreadyEquPro=null;
        this.returnedToVar=null;
        this.executor = executor || null;
        if (this.executor == null) {
            return;
        }
        var that = this;
        this.executor(function(e) {
            that.state = "fullfiled";
            that.fullfilResult = e;
            that.executed = true;

            if(that.alreadyEquPro){//ֻ��then���Ҳ����������һ��then�в�����promise���ſ�����alreadyEquPro��
              if(that.alreadyEquPro.subPromiseArr.length){
                that.constructor.alreadyThenContinue(that.alreadyEquPro,that.alreadyEquPro.fullfilFunArr,e);
              }else{
                that.alreadyEquPro.fullfilResult=e;
                that.alreadyEquPro.state="fullfiled";
                that.alreadyEquPro.executed=true;
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
            if(that.alreadyEquPro){//ֻ��then���Ҳ����������һ��then�в�����promise���ſ�����alreadyEquPro��
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
    mPromise.alreadyThenContinue=function(thenCalledPro,thenArguFunArr,thatResult){//֮ǰ��ThenExec
      var result,thenGenePro;
      for(var i=0;i<thenCalledPro.subPromiseArr.length;i++){
          result=thenArguFunArr[i](thatResult);
          if(result instanceof thenCalledPro.constructor){
            //�������that.subPromiseArr��ִ�п϶�����ʱ��
            thenGenePro=result;
            thenGenePro.alreadyEquPro=thenCalledPro.subPromiseArr[i];
          }else{
            thenGenePro=new thenCalledPro.constructor(function(fFlagFun){
                    fFlagFun(result);
                });
            //���������thenGenePro���ڳ�ʼ���У�û��ifelse�е��κ��߼���
            thenCalledPro.subPromiseArr[i].fullfilResult=thenGenePro.fullfilResult;
            thenCalledPro.subPromiseArr[i].state="fullfiled";
            thenCalledPro.subPromiseArr[i].executed=true;
            //��Ȼ����else��that.subPromiseArr����ͬ���ģ���Ҫ��������к����Ƿ���then���ã���״̬һ����fullfiled
            if(thenCalledPro.subPromiseArr[i].subPromiseArr.length){
              //that.subPromiseArr.then(cachesubPromiseArr.fullfilFunArr,cachesubPromiseArr.rejectFunArr);//��Ҫ���ε���then����ʵ���뵽then�󣬻���ִ��thenExec
              thenCalledPro.constructor.alreadyThenContinue(thenCalledPro.subPromiseArr[i],thenCalledPro.subPromiseArr[i].fullfilFunArr,result);
            }
          }
      }
    }
    mPromise.prototype.then = function(f, r) {
        this.fullfilFunArr.push(f || null);
        this.rejectFunArr.push(r || null);
        //1.������ʽ�Ӵ�-start
        //--promise has been defered  ֻ���ж�this.executed����
        var newestPromise;
        if(!this.executed){
          newestPromise=new mPromise();
          this.subPromiseArr.push(newestPromise);
          return newestPromise;
        }
        //������ʽ�Ӵ�-end

        //2.then�����
        //ִ��then�����--start
        //if(!this.subPromiseArr.length || this.protoThenCalled){//һ��promiseֻ�ܵ���һ��then��������ε��ã��������������һ��������
        //��if�ж��Ѳ���Ҫ����Ϊ�ۺϷ��֣�thenֻ��һ�ε��ã���Ȼ������������
          //a.�϶����Ѿ�ִ�����ˣ�����this.subPromiseArr=null ����
          //b.ͬһ��promise�ڶ��ε��ã���a.then();a.then();
        //�мǣ�����1�꣬һ��promise���ٴε���then�����ڶ�����ʽ��ͷ�ģ����this��ͬ���ģ����ڴˣ��������ʱ�ģ������ڴˣ������ڶ��subPromiseArr�㲥��
        //������ʱ���Դ�Ƭ�Σ���ֻ�����ڹ���n��ŵ��õ����Σ�
          var result;
          if(this.state=="fullfiled"){
            result=this.fullfilFunArr.pop()(this.fullfilResult);
          }else{
            result=this.rejectFunArr.pop()(this.rejectResult);
          }
          if(result instanceof this.constructor){
            newestPromise=result;
          }else{
            newestPromise=new this.constructor(function(fFlagFun){
                    fFlagFun(result);
                });
          }
          this.subPromiseArr.push(newestPromise);
          return newestPromise;//
        /*}else{
          if(this.state=="fullfiled"){
            this.constructor.thenExec(this,this.fullfilFunArr,this.fullfilResult);
          }else{
            this.constructor.thenExec(this,this.rejectFunArr,this.rejectResult);
          }
        }*/
        //ִ��then�����--end
    }