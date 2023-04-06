#ifndef _CONNECTION_POOL_
#define _CONNECTION_POOL_

#include<stdio.h>
#include<list>
#include<mysql/mysql.h>
#include<error.h>
#include<string.h>
#include<iostream>
#include<string>
#include "../lock/locker.h"
#include "../log/log.h"

using namespace std;

class connection_pool{
    public:
        MYSQL *GetConnection();
        bool ReleaseConnection(MYSQL *conn);
        int GetFreeConn();
        void DestroyPool();

        //单例模式
        static connection_pool *GetInstance();

        void init(string url,string User,string PassWord,string DataBaseName,int Port,int Maxconn,int close_log);

    private:
        connection_pool();
        ~connection_pool();

        int m_MaxConn;//最大连接数
        int m_CurConn;//当前已使用的链接数
        int m_FreeConn;//当前空闲的连接数
        locker lock;
        list<MYSQL *>connList;
        sem reserve;

    public:

        string m_url;//主机地址
        string m_Port;//数据库端口号
        string m_User;//登录数据库用户名
        string m_PassWord;//登录数据库密码
        string m_DataBaseName;//登录数据库名字
        int m_close_log;//日志开关

};


class connectionRAII{
    public:
        connectionRAII(MYSQL **con,connection_pool *connPool);
        ~connectionRAII();

    private:
        MYSQL *conRAII;
        connection_pool *poolRAII;
};

#endif
