# mPromise
##a simple promise
###Interface:
####prototype:
*then
*catch
####static method:
*all
*race
*resolve
*reject
###usage:
var a=new Promise(function(res,rej){setTimeout(function(){res("succ");},2000);})
####then
a.then(function(val){console.log(val);},function(reason){console.log(reason);});
####then chain
a.then(function(val){console.log(val);return "succ2";}).then(function(){...}).then(..);
####all
var a=new Promise(function(res,rej){setTimeout(function(){res("succA");},1000);})
var b=new Promise(function(res,rej){setTimeout(function(){res("succB");},2000);})
var c=new Promise(function(res,rej){setTimeout(function(){res("succC");},4000);})
var d=Promise.all([a,b,c]);
d.then(function(val){console.log(val);});//显示["succA","succB","succC"]
####race
var a=new Promise(function(res,rej){setTimeout(function(){res("succA");},1000);})
var b=new Promise(function(res,rej){setTimeout(function(){res("succB");},2000);})
var c=new Promise(function(res,rej){setTimeout(function(){res("succC");},4000);})
var d=Promise.race([a,b,c]);
d.then(function(val){console.log(val);});//显示"succA"  
###ps:
//promise“初始化过程完成”后（注意字眼：是实际任务完成后，而不是new Promise的完成），是否要包含下面的“开启当前promise的then函数执行动作”  
            //                     有无then调用  
            //                    有        无  
            //执行-        延时   yes       no  
            //过程         非延时 no        no  
调用then参数函数后，生成一个新的promise。  
a.非延时：将执行结果同步原有的子代链上，然后检测这个promise是否还有then调用，如果有，则调用execThenof代码。  
b.延时：将新生成的promise附加上原有的子代链。等改promise执行完后，同样执行类似a类中的步骤。  