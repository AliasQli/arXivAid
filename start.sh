docker-compose stop
docker-compose rm -f
docker image rm mirai
docker image rm arxivaid

docker pull mongo
docker image build -t mirai ./mirai
docker image build -t arxivaid ./arxivaid
docker-compose up