
#include "stdio.h"
#include <stdint.h>

#ifdef _WIN32
#include <Mswsock.h>
#include <Ws2def.h>
#include <winsock2.h>
typedef int socklen_t;
#elif defined(__linux__) || defined(__APPLE__)
#include <arpa/inet.h> //inet_addr
#include <fcntl.h>
#include <netinet/tcp.h>
#include <sys/select.h>
#include <sys/socket.h>
#include <sys/time.h>
#endif

#include <cerrno>
#include <cstring>
#include <unistd.h>
#include <string>

void print_usage() {

    printf("Kairos-CLI <ip-address> <command>\n");
    printf("Examples:\n");
    printf("--- Aux ---\n");
    printf("     Kairos-CLI <ip-address> AUX1.source=IN1\n");
    printf("--- Ram Player ---\n");
    printf("     Kairos-CLI <ip-address> RR1.play\n");
    printf("     Kairos-CLI <ip-address> RR1.pause\n");
    printf("--- Clip Player ---\n");
    printf("     Kairos-CLI <ip-address> CP1.play\n");
    printf("     Kairos-CLI <ip-address> CP2.pause\n");
    printf("--- Scene ---\n");
    printf("     Kairos-CLI <ip-address> SCENES.Main.Layers.Background.sourceA=CP1\n");
    printf("     Kairos-CLI <ip-address> SCENES.Main.auto\n");
    printf("     Kairos-CLI <ip-address> SCENES.Main.cut\n");
    printf("--- Macro ---\n");
    printf("     Kairos-CLI <ip-address> MACROS.<name>.play\n");
}

int sock = -1;
uint32_t port = 3005;

bool close_socket()
{
    if (sock > 0) {
#ifdef WIN32

        closesocket(sock);
#else
        ::shutdown(sock, SHUT_RDWR);
        ::close(sock);
#endif
        sock = -1;
        return true;
    }
    return false;
}

bool connect(const char* server) {
    sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);

#ifdef _WIN32
    if (sock == INVALID_SOCKET) {
        const auto err = WSAGetLastError();
        char*      s   = nullptr;
        FormatMessage(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM |
                          FORMAT_MESSAGE_IGNORE_INSERTS,
                      NULL,
                      err,
                      MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
                      (LPTSTR) &s,
                      0,
                      NULL);
        fprintf(stderr, "error: failed to create socket: %s\n", s);
        LocalFree(s);
        return false;
    }
#else
    if (sock == -1) {
        fprintf(stderr, "error: failed to create socket: %s\n", strerror(errno));
        return false;
    }
#endif

    int opt = 1;
    if (setsockopt(sock, IPPROTO_TCP, TCP_NODELAY, (char*) &opt, sizeof(opt)) < 0) {
        fprintf(stderr, "error: failed to setsockopt: %s\n", strerror(errno));
        close_socket();
        return false;
    }

    if (setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, (char*) &opt, sizeof(opt)) < 0) {
        fprintf(stderr, "error: failed to setsockopt: %s\n", strerror(errno));
        close_socket();
        return false;
    }

    struct sockaddr_in address = {}; /* the libc network address data structure */
    address.sin_addr.s_addr = inet_addr(server); /* assign the address */
    address.sin_port        = htons(port);             /* translate int2port num */
    address.sin_family      = AF_INET;


    if (::connect(sock, (struct sockaddr*) &address, sizeof(sockaddr_in)) == -1) {
        fprintf(stderr, "error: failed to setsockopt: %s\n", strerror(errno));
        close_socket();
        return false;
    }

    return true;
}

int main(int argc, char** argv)
{
    //printf("Kairos CLI\n");

    if( argc < 3 ) {
        print_usage();
        return 1;
    }

    const char* pServerAddress = argv[1];
    const char* pCmd = argv[2];

#if _WIN32
    WSADATA wsa;
    if(WSAStartup(MAKEWORD(2,2),&wsa) != 0) {
        printf("WSAStartup failed\n");
    }
#endif

    if( connect(pServerAddress) ) {
        //printf("send %s to %s\n", pCmd, pServerAddress);

        std::string cmd = pCmd;
        cmd += "\r\n";

        ssize_t rv = ::send(sock, (const char*) cmd.c_str(), cmd.length(), 0);
        if (rv != (ssize_t) cmd.length()) {
            printf("error: TcpClient::write() send data failed!\n");
        }

        char recv_buffer[1024];
        auto bytes_received = recv(sock, recv_buffer, 1024, 0);
        if( bytes_received >= 0 ) {
            recv_buffer[bytes_received] = 0;
        }
        printf("%s", recv_buffer);
        close_socket();
    } else {
        printf("error: can't connect to %s!\n", pServerAddress);
    }

    return 0;
}
