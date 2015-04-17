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
    principle 1��every promise in a chain can't be replaced considering correct referring
    principle 2��one promise can have only one fullfilResult/rejectResult,but can have an array of fullfilFuns/rejecFuns or subPromises
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
            if(that.placeholder){//ֻ��then���Ҳ����������һ��then�в�����promise���ſ�����placeholder��
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
            if(that.placeholder){//ֻ��then���Ҳ����������һ��then�в�����promise���ſ�����placeholder��
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
    Promise.execThenOf=function(thenCalledPro){//֮ǰ��ThenExec
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
            if(promise_air.executed){//then�Ĳ��������������£�new Promise(function(res){res("ss")})
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
            }//else�����£�������δ��ִ�У����캯���ڲ��Ĵ��룩setTimeout(,0) belongs to this
            //�ȵ�thenGeneProִ�е�ʱ�򣬴��¸������elseִ�е�����һ����
            //bug:���result��ͬ���ģ�new Promise(function(res){res("ss")})������ô������thenGenePro.placeholder��ǰ�����캯���ڲ���executor�Ѿ�ִ�����ˡ�
          }else{
            //then�Ĳ�������������ͨ���ݣ���return "ok";����stateһ����fullfiled,û��rejected
            thenCalledPro.subPromiseArr[i].fullfilResult=result;
            thenCalledPro.subPromiseArr[i].state="fullfiled";
            thenCalledPro.subPromiseArr[i].executed=true;
            //��Ȼ����else��that.subPromiseArr[i]����ͬ���ģ���Ҫ��������к����Ƿ���then���ã���״̬һ����fullfiled
            if(thenCalledPro.subPromiseArr[i].subPromiseArr.length){
              //that.subPromiseArr.then(cachesubPromiseArr.fullfilFunArr,cachesubPromiseArr.rejectFunArr);//��Ҫ���ε���then����ʵ���뵽then�󣬻���ִ��thenExec
              thenCalledPro.constructor.execThenOf(thenCalledPro.subPromiseArr[i]);
            }
          }
          //ship promise_air's info-END
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