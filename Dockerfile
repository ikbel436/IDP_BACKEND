FROM node:20.10.0-alpine

WORKDIR /

LABEL authors="Yosri Zaghouani <zaghouani.yosri@gmail.com>"


COPY ["./package.json", "package-lock.json", "./"]

RUN npm i

COPY . ./

EXPOSE 80

CMD [ "node", "index.js" ]
