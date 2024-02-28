FROM public.ecr.aws/lambda/nodejs:20

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

COPY . ${LAMBDA_TASK_ROOT}

RUN npm install

CMD [ "src/index.handler" ]