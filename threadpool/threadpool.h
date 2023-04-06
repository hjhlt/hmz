#ifndef THREADPOOL_H
#define THREADPOOL_H

#include<list>
#include<cstdio>
#include<exception>
#include<pthread.h>
#include "../lock/locker.h"
#include "../CGImysql/sql_connection_pool.h"

template <typename T>
class threadpool{
    public:
        //thread_number是线程池中线程的数量，max_request是请求队列最多允许的、等待处理的请求数量
        threadpool(int actor_model,connection_pool *connPool,int thread_number=8,int max_request=10000);
        ~threadpool();
        bool append(T *request,int state);
        bool append_p(T *request);

    private:
        //工作线程运行的函数，他不断地从工作队列中取出任务并执行
        static void *worker(void *agr);
        void run();

    private:
        int m_thread_number;//线程池中的线程数
        int m_max_requests;//请求队列中允许的最大请求数
        pthread_t *m_threads;//描述线程池的数组，其大小为m_thread_number
        std::list<T *>m_workqueue;//请求队列
        locker m_queuelocker;//保护请求队列的互斥锁
        sem m_queuestat;//是否有任务要处理
        connection_pool *m_connPool;//数据库连接池
        int m_actor_model;//模型切换
};


//初始化线程池数组
template <typename T>
threadpool<T>::threadpool(int actor_model,connection_pool *connPool,int thread_number,int max_requests) : m_actor_model(actor_model),m_thread_number(thread_number),m_max_requests(max_requests),m_threads(NULL),m_connPool(connPool)
{
    //如果小于等于0则错误
    if(thread_number<=0||max_requests<=0){
        throw std::exception();
    }

    //创建线程池数组
    m_threads=new pthread_t[m_thread_number];
    if(!m_threads){
        throw std::exception();
    }

    for(int i=0;i<thread_number;i++){
        //创建每一个线程
        //第一个参数为指向线程标识符的指针。
        //第二个参数用来设置线程属性。
        //第三个参数是线程运行函数的起始地址。
        //最后一个参数是运行函数的参数。
        if(pthread_create(m_threads+i,NULL,worker,this)!=0){
            delete[] m_threads;
            throw std::exception();
        }
        //这将该子线程的状态设置为detached,则该线程运行结束后会自动释放所有资源。
        if(pthread_detach(m_threads[i])){
            delete[] m_threads;
            throw std::exception();
        }
    }
}

//销毁线程池数组
template<typename T>
threadpool<T>::~threadpool(){
    delete[] m_threads;
}

//往工作队列中加入请求
template<typename T>
bool threadpool<T>::append(T *request,int state){
    m_queuelocker.lock();
    //如果请求数量到了上限则返回false
    if(m_workqueue.size()>=m_max_requests){
        m_queuelocker.unlock();
        return false;
    }

    request->m_state=state;
    m_workqueue.push_back(request);
    m_queuelocker.unlock();
    m_queuestat.post();
    return true;

}


template<typename T>
bool threadpool<T>::append_p(T *request){
    m_queuelocker.lock();
    if(m_workqueue.size()>=m_max_requests){
        m_queuelocker.unlock();
        return false;
    }
    m_workqueue.push_back(request);
    m_queuelocker.unlock();
    m_queuestat.post();
    return true;
}

template <typename T>
void *threadpool<T>::worker(void *arg){
    threadpool *pool=(threadpool *)arg;
    pool->run();
    return pool;
}

//线程工作函数
template <typename T>
void threadpool<T>::run(){
    while(true){
        m_queuestat.wait();
        m_queuelocker.lock();
        if(m_workqueue.empty()){
            m_queuelocker.unlock();
            continue;
        }
        T *request=m_workqueue.front();
        m_workqueue.pop_front();
        m_queuelocker.unlock();
        if(!request){
            continue;
        }

        if(m_actor_model==1){
            if(request->m_state==0){
                if(request->read_once()){
                    request->improv=1;
                    connectionRAII mysqlcon(&request->mysql,m_connPool);
                    request->process();
                }
                else{
                    request->improv=1;
                    request->timer_flag=1;
                }
            }
            else{
                if(request->write()){
                    request->improv=1;
                }
                else{
                    request->improv=1;
                    request->timer_flag=1;
                }
            }
        }
        else {
            connectionRAII mysqlcon(&request->mysql,m_connPool);
            request->process();
        }

    }
}

#endif
