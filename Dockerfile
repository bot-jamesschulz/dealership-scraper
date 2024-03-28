FROM public.ecr.aws/lambda/nodejs:20

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

COPY package.json package-lock.json ${LAMBDA_TASK_ROOT}

RUN npm install

COPY . ${LAMBDA_TASK_ROOT}

CMD [ "src/index.handler" ]