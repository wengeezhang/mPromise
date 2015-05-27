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
    principle 1�� every promise in a chain can't be replaced considering correct referring
    principle 2�� one promise can have only one fullfilResult/rejectResult,but can have an array of fullfilFuns/rejecFuns or subPromises
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
            if(that.placeholder){//ֻ��then���Ҳ����������һ��then�в�����promise���ſ�����placeholder��
              that_placeholder=that.placeholder;
              that_placeholder.fullfilResult=e;
              that_placeholder.state="resolved";
              that_placeholder.executed=true;
              if(that_placeholder.subPromiseArr.length){
                that.constructor.execThenOf(that_placeholder);
              }
              //���½��bug1:
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
            if(that.placeholder){//ֻ��then���Ҳ����������һ��then�в�����promise���ſ�����placeholder��
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
    Promise.execThenOf=function(thenCalledPro){//֮ǰ��ThenExec
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
              if(promise_air.executed){//then�Ĳ��������������£�new Promise(function(res){res("ss")})
                if(promise_air.state=="resolved"){
                  promise_Holder.fullfilResult=promise_air.fullfilResult;
                  promise_Holder.state="resolved";
                }else{
                  promise_Holder.rejectResult=promise_air.rejectResult;
                  promise_Holder.state="rejected";
                }
                promise_Holder.executed=true;
                
              }//else�����£�������δ��ִ�У����캯���ڲ��Ĵ��룩setTimeout(,0) belongs to this
              //�ȵ�thenGeneProִ�е�ʱ�򣬴��¸������elseִ�е�����һ����
              //bug:���result��ͬ���ģ�new Promise(function(res){res("ss")})������ô������thenGenePro.placeholder��ǰ�����캯���ڲ���executor�Ѿ�ִ�����ˡ�
            }else{
              //then�Ĳ�������������ͨ���ݣ���return "ok";����stateһ����resolved,û��rejected
              curSubPromise.fullfilResult=result;
              curSubPromise.state="resolved";
              curSubPromise.executed=true;
              //���½��bug1:
              if(curSubPromise.placeholder){
                curSubPromise.placeholder.fullfilResult=result;
                curSubPromise.placeholder.state="resolved";
                curSubPromise.placeholder.executed=true;
                if(curSubPromise.placeholder.subPromiseArr.length){
                  curSubPromise.constructor.execThenOf(curSubPromise.placeholder);
                }
              }
              //��Ȼ����else��that.subPromiseArr[i]����ͬ���ģ���Ҫ��������к����Ƿ���then���ã���״̬һ����resolved
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
        //1.������ʽ�Ӵ�-start
        //--promise has been defered  ֻ���ж�this.executed����
        var result,thenGenePro,upperArgFun;
        if(!this.executed){
          thenGenePro=new this.constructor();
          this.subPromiseArr.push(thenGenePro);//async,we call this empty promse "promise_Holder".
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
        //ִ��then�����--end
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