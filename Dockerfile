FROM node
COPY . /arxivaid
WORKDIR /arxivaid
RUN npm install
EXPOSE 80