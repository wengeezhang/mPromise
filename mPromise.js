    function mPromise(executor) {
        this.executed = false;
        this.state = "pending";
        this.thenCalled = false;
        this.thenExecuted = false;
        this.fullfilFun = null;
        this.rejectFun = null;
        this.fullfilResult = null;
        this.rejectResult = null;
        this.subPromise = null;
        this.executor = executor || null;
        if (this.executor == null) {
            return;
        };
        var that = this;
        this.executor(function(e) {
            that.state = "fullfiled";
            that.fullfilResult = e;
            that.executed = true;
            if (that.thenCalled && !that.thenExecuted) {
                var f = that.subPromise.fullfilFun,
                    r = that.subPromise.rejectFun;
                that.subPromise = that.fullfilFun(that.fullfilResult);
                if(!(that.subPromise instanceof that.constructor)){
                    that.subPromise=new that.constructor(function(fFlagFun){
                        fFlagFun(that.subPromise);
                    });
                }
                if (!f) {//no more then called
                    return;
                }
                that.subPromise.then(f, r);
            }
        }, function(e) {
            that.state = "rejected";
            that.rejectResult = e;
            that.executed = true;
            if (that.thenCalled && !that.thenExecuted) {
                var f = that.subPromise.fullfilFun,
                    r = that.subPromise.rejectFun;
                that.subPromise = that.rejectFun(that.rejectResult);
                if(!(that.subPromise instanceof that.constructor)){
                    that.subPromise=new that.constructor(function(fFlagFun){
                        fFlagFun(that.subPromise);
                    });
                }
                if (!r) {//no more then called
                    return;
                }
                that.subPromise.then(f, r);
            }
        });
    };
    mPromise.prototype.then = function(f, r) {
        this.fullfilFun = f || null;
        this.rejectFun = r || null;
        this.thenCalled = true;
        if (!this.executed || this.executor == null) {
            this.subPromise = new this.constructor();
            return this.subPromise;
        };
        this.thenExecuted = true;

        if (this.state == "fullfiled") {
            this.subPromise = this.fullfilFun(this.fullfilResult);
        } else {
            this.subPromise = this.rejectFun(this.rejectResult);
        }
        if(!(this.subPromise instanceof this.constructor)){
            this.subPromise=new this.constructor(function(fFlagFun){
                fFlagFun(this.subPromise);
            });
        }
        return this.subPromise;
    }
    var a = new mPromise(function(fFlagFun, rFlagFun) {
        setTimeout(function() {
            console.log(1);
            if (1) {
                fFlagFun("执行");
            } else {
                rFlagFun("拒绝");
            };
        }, 3000);
    });
    a.then(function(e) {
        console.log(e);
        return new mPromise(function(fFlagFun, rFlagFun) {
            setTimeout(function() {
                if (1) {
                    fFlagFun("执行--衍生promise");
                } else {
                    rFlagFun("拒绝--衍生promise");
                }
            }, 3000);
        });
    }, function(e) {
        console.log(e);
        return "then 返回值";
    }).then(function(e) {
        console.log(e);
    }, function(e) {
        console.log(e);
    });