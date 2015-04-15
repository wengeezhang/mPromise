    /*
    author:wengeezhang;
    version:1.0;
    
    prototype:then
    public static member:execThenOf
    principle 1��every promise in a chain can't be replaced considering correct referring
    principle 2��one promise only one fullfil/rejectResult,but can have an array of fullfil/rejecFun or subPromise
    */
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
            if(that.alreadyEquPro){//ֻ��then���Ҳ����������һ��then�в�����promise���ſ�����alreadyEquPro��
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
    mPromise.execThenOf=function(thenCalledPro){//֮ǰ��ThenExec
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
            //�������thenCalledPro.subPromiseArr[i]��ִ�п϶�����ʱ��
            thenGenePro=result;
            thenGenePro.alreadyEquPro=thenCalledPro.subPromiseArr[i];
            //�ȵ�thenGeneProִ�е�ʱ�򣬴��¸������elseִ�е�����һ����
          }else{
            thenCalledPro.subPromiseArr[i].fullfilResult=result;
            thenCalledPro.subPromiseArr[i].state="fullfiled";
            thenCalledPro.subPromiseArr[i].executed=true;
            //��Ȼ����else��that.subPromiseArr����ͬ���ģ���Ҫ��������к����Ƿ���then���ã���״̬һ����fullfiled
            if(thenCalledPro.subPromiseArr[i].subPromiseArr.length){
              //that.subPromiseArr.then(cachesubPromiseArr.fullfilFunArr,cachesubPromiseArr.rejectFunArr);//��Ҫ���ε���then����ʵ���뵽then�󣬻���ִ��thenExec
              thenCalledPro.constructor.execThenOf(thenCalledPro.subPromiseArr[i]);
            }
          }
      }
    }
    mPromise.prototype.then = function(f, r) {
        this.fullfilFunArr.push(f || null);
        this.rejectFunArr.push(r || null);
        //1.������ʽ�Ӵ�-start
        //--promise has been defered  ֻ���ж�this.executed����
        var result,thenGenePro,upperArgFun;
        if(!this.executed){
          thenGenePro=new this.constructor();
          this.subPromiseArr.push(thenGenePro);
          return thenGenePro;
        }
        //������ʽ�Ӵ�-end

        //2.then�����
        //ִ��then�����--start
        //if(!this.subPromiseArr.length || this.protoThenCalled){//һ��promiseֻ�ܵ���һ��then��������ε��ã��������������һ��������
        //��if�ж��Ѳ���Ҫ���϶������if���档��Ϊ�ۺϷ��֣�thenֻ��һ�ε��ã���Ȼ������������
          //a.�϶����Ѿ�ִ�����ˣ�����this.subPromiseArr=null ����
          //b.ͬһ��promise�ڶ��ε��ã���a.then();a.then();
        //�мǣ�����1�꣬һ��promise���ٴε���then�����ڶ�����ʽ��ͷ�ģ����this��ͬ���ģ����ڴˣ��������ʱ�ģ������ڴˣ������ڶ��subPromiseArr�㲥��
        //������ʱ���Դ�Ƭ�Σ���ֻ�����ڹ���n��ŵ��õ����Σ�
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
        //ִ��then�����--end
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