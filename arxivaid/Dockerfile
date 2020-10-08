FROM node
COPY . /arxivaid
WORKDIR /arxivaid
RUN npm install
EXPOSE 80
CMD (node script/init.js &); (node server/server.js)