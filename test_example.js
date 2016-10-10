//1.parallel then chain
var a=new Promise(function(res,rej){
  setTimeout(function(){res("haha1");},1000);
});
a.then(function(val){console.log(val);return "haha2-succ";},
  function(reason){console.log(reason);return "haha2-fail";}
).then(function(val){
  console.log(val);
  return new Promise(function(res,rej){setTimeout(function(){rej("haha3-fail");},1000);})
}).catch(function(reason){
  console.log(reason);
  return new Promise(function(res,rej){setTimeout(function(){res("haha4-succ");},1000);})
}).then(function(val){console.log(val);return 1;}) 
a.then(function(val){console.log(val);return "b2-succ";},
  function(reason){console.log(reason);return "b2-fail";}
).then(function(val){
  console.log(val);
  return new Promise(function(res,rej){setTimeout(function(){rej("b3-fail");},1000);})
}).catch(function(reason){
  console.log(reason);
  return new Promise(function(res,rej){setTimeout(function(){res("b4-succ");},1000);})
}).then(function(val){console.log(val);return 1;}) 


//2.return a then chain
var a=new Promise(function(res,rej){
setTimeout(function(){res("hah1");},1000);
}).then(function(val){
   console.log(val);
   return new Promise(function(res,rej){
             setTimeout(function(){res("hah2");},1000);
          }).then(function(val){
              console.log(val);
              return "hah3";
            });
}).then(function(val){console.log(val);});


//3.another return a then chain
var a=new Promise(function(res,rej){
setTimeout(function(){res("hah1");},1000);
}).then(function(val){
   console.log(val);
   return new Promise(function(res,rej){
             setTimeout(function(){res("hah2");},1000);
          }).then(function(val){
              console.log(val);
              return new Promise(function(res,rej){setTimeout(function(){res("hah3");},1000);});
            });
}).then(function(val){console.log(val);});

//4.again another return a then chain
var wen=Promise.resolve("ddd").then(function(value){
  console.log(value);
  return new Promise(function(res,rej){
           setTimeout(function(){res("hah1");},1000);
         }).then(function(val){
                console.log(val);
                return Promise.resolve("1").then(function(val){
                       return Promise.resolve("2");
                });
  });
});
wen.then(function(value){console.log(value);});

//5.microtask + macrotask queue
setTimeout(function(){
  console.log("s1");
  new Promise(function(res,rej){
    setTimeout(function(){res("promise0");},0);
  }).then(function(value){
    console.log(value);return "promise1";
  }).then(function(value){
    console.log(value);return "promise2";
  }).then(function(value){
    console.log(value);return "promise3";
  }).then(function(value){
    console.log(value);return "promise4";
  }).then(function(value){
    console.log(value);return "promise5";
  }).then(function(value){console.log(value);return "promise6";});
},1000);
setTimeout(function(){console.log("s2");},1000);
setTimeout(function(){console.log("s3");},1000);
setTimeout(function(){console.log("s4");},1000);
setTimeout(function(){console.log("s5");},1000);
console.log("start");


//6.another macritask+microtask
setTimeout(function(){
  console.log("s1");
  new Promise(function(res,rej){
    res("promise0");
  }).then(function(value){
    console.log(value);return "promise1";
  }).then(function(value){
    console.log(value);return "promise2";
  }).then(function(value){
    console.log(value);return "promise3";
  }).then(function(value){
    console.log(value);return "promise4";
  }).then(function(value){
    console.log(value);return "promise5";
  }).then(function(value){console.log(value);return "promise6";});
},1000);
setTimeout(function(){console.log("s2");},1000);
setTimeout(function(){console.log("s3");},1000);
setTimeout(function(){console.log("s4");},1000);
setTimeout(function(){console.log("s5");},1000);
console.log("start");

//7.a simple microtask+macrotask log:1,3,dd,2;
console.log(1);
setTimeout(function(){console.log(2);},0);
Promise.resolve("dd").then(function(val){console.log(val);});
console.log(3);

//8.horrible nesting to check microtask,log:dd,ddd,dddd,...,ddddddddd
Promise.resolve("dd").then(function(val){
  console.log(val);
  return Promise.resolve("ddd").then(function(val){
   console.log(val);return "dddd";
  }).then(function(val){
    console.log(val);return "ddddd";
  }).then(function(val){
    console.log(val);return "dddddd";
  }).then(function(val){
    console.log(val);return new Promise(function(res,rej){setTimeout(function(){res("ddddddd");},1000);
  }).then(function(val){
    console.log(val);return "dddddddd";
  });
}).then(function(val){
 console.log(val);return "ddddddddd";});
}).then(function(val){
 console.log(val);
});

//9.thenable object:
//a.//log:function,haha
Promise.resolve({then:function(d){console.log(d);d("haha")}}).then(function(val){console.log(val);});
//b.//log:1
Promise.resolve({then:function(){console.log(1);}}).then(function(val){console.log(val);});
//c.//log:jd,hshs;
new Promise(function(res,rej){res({then:function(resolve){console.log("jd");resolve("hshs")}})}).then(function(val){console.log(val);});
//d.//log:jd
var wen=new Promise(function(res,rej){setTimeout(function(){res({then:function(){console.log("jd");}})},1000);});
wen.then(function(val){console.log(val);});
//e.//log:function,jd
var wen=new Promise(function(res,rej){setTimeout(function(){res({then:function(d){console.log(d);d("jd");}})},1000);});
wen.then(function(val){console.log(val);});
//f.//log:undefined
Promise.resolve({then:function(d){d()}}).then(function(val){console.log(val);});

//10.res(promise);both log:dd
//a.
var wen=new Promise(function(res,rej){res(new Promise(function(res,rej){setTimeout(function(){res("dd")},1000)}));});
wen.then(function(val){console.log(val);});
//b.
var wen=new Promise(function(res,rej){res(new Promise(function(res,rej){res(Promise.resolve("dd"));}));});
wen.then(function(val){console.log(val);});

//11.res(thenable/promise) plus nesting
//a.log:dd
Promise.resolve({then:function(d){d({then:function(f){f("dd");}})}}).then(function(val){console.log(val);}); 
//b.log:dd
Promise.resolve({then:function(d){d({then:function(f){f(Promise.resolve({then:function(ll){ll("dd");}}));}})}}).then(function(val){console.log(val);});
//c.log:dd
Promise.resolve({then:function(d){d({then:function(f){f(Promise.resolve({then:function(ll){ll(Promise.resolve("dd"));}}));}})}}).then(function(val){console.log(val);});
//d.log:dd
Promise.resolve({then:function(d){d({then:function(f){f(new Promise(function(res,rej){setTimeout(function(){res("dd")},1000)}));}})}}).then(function(val){console.log(val);});
//e.log:dd
Promise.resolve({then:function(d){d({then:function(f){f(Promise.resolve({then:function(ll){ll(Promise.resolve(new Promise(function(res,rej){setTimeout(function(){res({then:function(mm){mm("dd");}});},1000);})));}}));}})}}).then(function(val){console.log(val);});


//12. a VS b VS c
//a.log:jd  --(no d(),so just log "jd",not log undefined.)
var wen=new Promise(function(res,rej){setTimeout(function(){res({then:function(d){console.log("jd");}})},1000);});
wen.then(function(val){console.log(val);});
//b.log:dd,ddd
Promise.resolve("dd").then(function(val){console.log(val);return "ddd";}).then(function(val){console.log(val);});
//c.log:dd,undefined
Promise.resolve("dd").then(function(val){console.log(val);}).then(function(val){console.log(val);});

//13.reject，just use whatever passed in;log:object
Promise.reject({then:function(d){console.log(1);d(2);}}).catch(function(val){console.log(val);});

//14.res(false/undefined/null)
//a.log:false
new Promise(function(res,rej){res(false);}).then(function(val){console.log(val);}); 
//b.log:1,false
Promise.resolve({then:function(d){console.log(1);d(false);}}).then(function(val){console.log(val);});
//c.log:null
new Promise(function(res,rej){res(null);}).then(function(val){console.log(val);});
//d.log:undefined
new Promise(function(res,rej){res(undefined);}).then(function(val){console.log(val);});



//15.new Promise内部为同步过程 验证样例
//打印1,2，然后才打印3
Promise.resolve(new Promise(function(res,rej){console.log(1);res(2);})).then(function(val){console.log(val);});
Promise.resolve(3).then(function(val){console.log(val);});


//16.打印顺序是d,1,null,undefiined,dd,
//而不是d,1,dd,null,undefined
//充分证明，下面的样例b，先microThen，发现superResult是thenable,于是修改father的状态，重新跑一遍
//即再跑的过程中，又实用micro
//a.
new Promise(function(res,rej){res('d');}).then(function(val){console.log(val);}); 
//b.
Promise.resolve({then:function(d){console.log(1);d('dd');}}).then(function(val){console.log(val);});
//c.log:null
new Promise(function(res,rej){res(null);}).then(function(val){console.log(val);});
//d.log:undefined
new Promise(function(res,rej){res(undefined);}).then(function(val){console.log(val);});
