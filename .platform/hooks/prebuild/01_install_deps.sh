#!/bin/sh
echo "TEST"
chown -R nodejs:nodejs /var/app
yum -y install fontconfig freetype freetype-devel fontconfig-devel libstdc++ wget bzip2 tar