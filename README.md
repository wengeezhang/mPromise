# Promise
###1.Interface:
#####prototype:
* then
* catch  

#####static method:
* all
* race
* resolve
* reject  

###2.usage:
#####create Promise instance
```javascript
var a=new Promise(function(res,rej){setTimeout(function(){res("succ-a");},2000);})//succ in the future
var b=new Promise(function(res,rej){setTimeout(function(){rej("fail-b");},2000);})//fail in the future
var c=new Promise(function(res,rej){setTimeout(function(){res("succ-c");},2000);})//succ in the future
```
#####then
```javascript
a.then(function(val){console.log(val);},function(reason){console.log(reason);});//output:"succ-a"
```
#####catch
```javascript
b.then(function(val){console.log(val);}).catch(function(reason){console.log(reason);});//output:"fail-b"
```
#####then chain
```javascript
a.then(function(val){console.log(val);return "succ-a2";}).then(function(val){console.log(val);});//output:"succ-a","succ-a2"
```
#####then nest
```javascript
a.then(function(val){console.log(val);return c.then(function(value){console.log(value);return "nest";});}).then(function(val){console.log(val);});//output:"succ-a","succ-c","nest"
```
#####all
```javascript
var d1=new Promise(function(res,rej){setTimeout(function(){res("d1");},1000);})
var d2=new Promise(function(res,rej){setTimeout(function(){res("d2");},2000);})
var d3=new Promise(function(res,rej){setTimeout(function(){res("d3");},4000);})
var e=Promise.all([d1,d2,d3]);
e.then(function(val){console.log(val);});//output:["d1","d2","d3"]
```
#####race
```javascript
var f1=new Promise(function(res,rej){setTimeout(function(){res("f1");},1000);})
var f2=new Promise(function(res,rej){setTimeout(function(){res("f2");},2000);})
var f3=new Promise(function(res,rej){setTimeout(function(){res("f3");},4000);})
var g=Promise.race([f1,f2,f3]);
g.then(function(val){console.log(val);});//output:"f1"  
```
###3.analysis:
Example:x_promise.then(F1,F2).then(F3,F4).[---].then(Fm,Fn).
*x_promise:      a promise which is async.
*chain:          promise(x_promise)->promise(F1/2)->promise(F3/4)...->promise(Fm/n)
*promise_Holder: an empty promise returned by then immediately.In the example-- x_promise.then(F1,F2).In chain.
*promise_air:    a promise returned by F1/2();Not in chain.
*placeholder:    a property of promise_air;    It refers to promise_Holder.
*promise_air.placeholder=promise_Holder.