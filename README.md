# Promise
###Interface:
#####prototype:
* then
* catch  

#####static method:
* all
* race
* resolve
* reject  

###usage:
```javascript
var a=new Promise(function(res,rej){setTimeout(function(){res("succ");},2000);})//succ in the future
var b=new Promise(function(res,rej){setTimeout(function(){rej("fail");},2000);})//fail in the future
```
#####then
```javascript
a.then(function(val){console.log(val);},function(reason){console.log(reason);});//output:"succ"
```
#####catch
```javascript
b.then(function(val){console.log(val);}).catch(function(reason){console.log(reason);});//output:"fail"
```
#####then chain
```javascript
a.then(function(val){console.log(val);return "succ2";}).then(function(val){console.log(val);});//output:"succ","succ2"
```
#####all
```javascript
var c1=new Promise(function(res,rej){setTimeout(function(){res("succA");},1000);})
var c2=new Promise(function(res,rej){setTimeout(function(){res("succB");},2000);})
var c3=new Promise(function(res,rej){setTimeout(function(){res("succC");},4000);})
var d=Promise.all([c1,c2,c3]);
d.then(function(val){console.log(val);});//显示["succA","succB","succC"]
```
#####race
```javascript
var e1=new Promise(function(res,rej){setTimeout(function(){res("succA");},1000);})
var e2=new Promise(function(res,rej){setTimeout(function(){res("succB");},2000);})
var e3=new Promise(function(res,rej){setTimeout(function(){res("succC");},4000);})
var f=Promise.race([e1,e2,e3]);
f.then(function(val){console.log(val);});//显示"succA"  
```
###ps:
//promise“初始化过程完成”后（注意字眼：是实际任务完成后，而不是new Promise的完成），是否要包含下面的“开启当前promise的then函数执行动作”  
            //                     有无then调用  
            //                    有        无  
            //执行-        延时   yes       no  
            //过程         非延时 no        no  
调用then参数函数后，生成一个新的promise。  
a.非延时：将执行结果同步原有的子代链上，然后检测这个promise是否还有then调用，如果有，则调用execThenof代码。  
b.延时：将新生成的promise附加上原有的子代链。等改promise执行完后，同样执行类似a类中的步骤。  