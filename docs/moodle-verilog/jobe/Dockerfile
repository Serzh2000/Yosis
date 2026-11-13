# Песочница Jobe для CodeRunner: только Python (нужен Jobe) и Icarus Verilog.
# По мотивам trampgeek/jobeinabox. Базовый образ берётся из зеркала Яндекса: прямой docker.io на этом
# сервере отдаёт битые слои.
#
# Сборка:  docker build -t yosis-jobe /путь/к/jobe
# Запуск:  docker run -d --name jobe --restart unless-stopped -p 127.0.0.1:4000:80 yosis-jobe

FROM cr.yandex/mirror/library/debian:12-slim

ENV APACHE_RUN_USER=www-data \
    APACHE_RUN_GROUP=www-data \
    APACHE_LOG_DIR=/var/log/apache2 \
    APACHE_LOCK_DIR=/var/lock/apache2 \
    APACHE_PID_FILE=/var/run/apache2.pid \
    LANG=C.UTF-8 \
    DEBIAN_FRONTEND=noninteractive

COPY 000-jobe.conf /
COPY VerilogTask.php /

RUN apt-get update && \
    apt-get --no-install-recommends install -yq \
        acl apache2 build-essential ca-certificates git iverilog libapache2-mod-php \
        php php-cli php-mbstring php-intl python3 sqlite3 sudo tzdata unzip && \
    ln -sf /proc/self/fd/1 /var/log/apache2/access.log && \
    ln -sf /proc/self/fd/1 /var/log/apache2/error.log && \
    sed -i "s/^export LANG=.*/export LANG=$LANG/" /etc/apache2/envvars && \
    sed -i '1 i ServerName localhost' /etc/apache2/apache2.conf && \
    sed -i 's/ServerTokens\ OS/ServerTokens \Prod/g' /etc/apache2/conf-enabled/security.conf && \
    sed -i 's/ServerSignature\ On/ServerSignature \Off/g' /etc/apache2/conf-enabled/security.conf && \
    rm /etc/apache2/sites-enabled/000-default.conf && \
    mv /000-jobe.conf /etc/apache2/sites-enabled/ && \
    mkdir -p /var/crash && chmod 777 /var/crash && \
    echo '<!DOCTYPE html><html lang="en"><title>Jobe</title><h1>Jobe</h1></html>' > /var/www/html/index.html && \
    git clone --depth 1 --single-branch --branch master https://github.com/trampgeek/jobe.git /var/www/html/jobe && \
    cp /VerilogTask.php /var/www/html/jobe/app/Libraries/VerilogTask.php && rm /VerilogTask.php && \
    apache2ctl start && \
    cd /var/www/html/jobe && \
    /usr/bin/python3 /var/www/html/jobe/install --max_uid=500 && \
    chown root:root /var/www/html/jobe/runguard/runguard /var/www/html/jobe/runguard/rmjobedir && \
    chmod 700 /var/www/html/jobe/runguard/runguard /var/www/html/jobe/runguard/rmjobedir && \
    apt-get -y autoremove --purge && apt-get -y clean && rm -rf /var/lib/apt/lists/*

EXPOSE 80
HEALTHCHECK --interval=1m --timeout=5s CMD /usr/bin/python3 /var/www/html/jobe/minimaltest.py || exit 1
CMD ["/usr/sbin/apache2ctl", "-D", "FOREGROUND"]
