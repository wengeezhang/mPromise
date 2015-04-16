# mPromise
##a simple promise
###
//promise“初始化过程完成”后（注意字眼：是实际任务完成后，而不是new Promise的完成），是否要包含下面的“开启当前promise的then函数执行动作”  
            //                     有无then调用  
            //                    有        无  
            //执行-        延时   yes       no  
            //过程         非延时 no        no  
调用then参数函数后，生成一个新的promise。  
a.非延时：将执行结果同步原有的子代链上，然后检测这个promise是否还有then调用，如果有，则调用execThenof代码。  
b.延时：将新生成的promise附加上原有的子代链。等改promise执行完后，同样执行类似a类中的步骤。  