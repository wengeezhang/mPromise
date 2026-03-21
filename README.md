# Description

A hand-written JavaScript Promise implementation (mPromise) created circa 2015. This project builds an ES6 Promise from scratch, covering the core API surface: prototype methods (`then`, `catch`) and static methods (`Promise.all`, `Promise.race`, `Promise.resolve`, `Promise.reject`).

The implementation introduces several key concepts to handle chained and nested promises. A `promise_holder` is the empty Promise returned immediately by `then()` as a placeholder, while a `promise_air` is the Promise returned by the `then` callback at execution time. These two are linked via a `placeholder` property so that chain results propagate correctly. Async scheduling uses `_microDefer`, which selects `MutationObserver` > `MessageChannel` > `setTimeout` by priority to simulate microtask behavior.

The project includes 18 test scenarios in `test_example.js`, covering chained calls, nested returns, thenable objects, `res(promise)`, and microtask/macrotask execution ordering.

# Promise
### 1.Interface:
##### prototype:
* then
* catch  

##### static method:
* all
* race
* resolve
* reject  

### 2.usage:
##### create Promise instance
```javascript
var a=new Promise(function(res,rej){setTimeout(function(){res("succ-a");},2000);})//succ in the future
var b=new Promise(function(res,rej){setTimeout(function(){rej("fail-b");},2000);})//fail in the future
var c=new Promise(function(res,rej){setTimeout(function(){res("succ-c");},2000);})//succ in the future
```
##### then
```javascript
a.then(function(val){console.log(val);},function(reason){console.log(reason);});//output:"succ-a"
```
##### catch
```javascript
b.then(function(val){console.log(val);}).catch(function(reason){console.log(reason);});//output:"fail-b"
```
##### then chain
```javascript
a.then(function(val){console.log(val);return "succ-a2";}).then(function(val){console.log(val);});//output:"succ-a","succ-a2"
```
##### then nest
```javascript
a.then(function(val){console.log(val);return c.then(function(value){console.log(value);return "nest";});}).then(function(val){console.log(val);});//output:"succ-a","succ-c","nest"
```
##### all
```javascript
var d1=new Promise(function(res,rej){setTimeout(function(){res("d1");},1000);})
var d2=new Promise(function(res,rej){setTimeout(function(){res("d2");},2000);})
var d3=new Promise(function(res,rej){setTimeout(function(){res("d3");},4000);})
var e=Promise.all([d1,d2,d3]);
e.then(function(val){console.log(val);});//output:["d1","d2","d3"]
```
##### race
```javascript
var f1=new Promise(function(res,rej){setTimeout(function(){res("f1");},1000);})
var f2=new Promise(function(res,rej){setTimeout(function(){res("f2");},2000);})
var f3=new Promise(function(res,rej){setTimeout(function(){res("f3");},4000);})
var g=Promise.race([f1,f2,f3]);
g.then(function(val){console.log(val);});//output:"f1"  
```
### 3.analysis:
Example:x_promise.then(F1,F2).then(F3,F4).[---].then(Fm,Fn).
*x_promise:      a promise which is async.
*chain:          promise(x_promise)->promise(F1/2)->promise(F3/4)...->promise(Fm/n)
*promise_Holder: an empty promise returned by then immediately.In the example-- x_promise.then(F1,F2).In chain.
*promise_air:    a promise returned by F1/2();Not in chain.
*placeholder:    a property of promise_air;    It refers to promise_Holder.
*promise_air.placeholder=promise_Holder.
