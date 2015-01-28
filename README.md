# mPromise
a simple promise 
//promise“初始化过程完成”后（注意字眼：是实际任务完成后，而不是new Promise的完成），是否要包含下面的“开启当前promise的then函数执行动作”
            //                     有无then调用
            //                    有        无
            //执行-        延时   yes       no
            //过程         非延时 no        no
