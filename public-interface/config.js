/**
 * Copyright (c) 2014 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* default configuration handled with dynamic environment */

var cfenvReader = require('./lib/cfenv/reader'),
 postgres_credentials = cfenvReader.getServiceCredentials("mypostgres"),
 backend_credentials = cfenvReader.getServiceCredentials("backend-ups"),
 mail_credentials = cfenvReader.getServiceCredentials("mysmtp"),
 mail_user_credentials = cfenvReader.getServiceCredentials("mail-ups"),
 websocket_credentials = cfenvReader.getServiceCredentials('websocket-ups'),
 reCaptcha_credentials = cfenvReader.getServiceCredentials("recaptcha-ups"),
 redis_credentials = cfenvReader.getServiceCredentials("myredis"),
 rule_engine_credentials = cfenvReader.getServiceCredentials("rule-engine-credentials-ups"),
 gateway_user_credentials = cfenvReader.getServiceCredentials("gateway-credentials-ups"),
 dashboard_security_credentials = cfenvReader.getServiceCredentials("dashboard-security-ups"),
 kafka_credentials = cfenvReader.getServiceCredentials("kafka-ups");

var config = {
    api: {
        forceSSL: true,
        port: process.env.PORT || 4001,
        socket: 1024,
        bodySizeLimit: '256kb'
    },
    biz: {
        domain: {
            defaultHealthTimePeriod: 86400, // 1 day in secs
            defaultPasswordTokenExpiration: 60, // in minutes
            defaultActivateTokenExpiration: 60, // in minutes
            defaultPasswordResetPath: '/ui/auth#/resetPassword?token=',
            defaultActivatePath: '/ui/auth#/activate?token='
        }
    },
    auth: {
        facebook: {
            clientID: '',
            clientSecret: '',
            callbackURL: ''
        },
        github: {
            clientID: '',
            clientSecret: '',
            callbackURL: ""
        },
        google: {
            clientID: '',
            clientSecret: '',
            callbackURL: ''
        },
        keys: {
            private_pem_path: dashboard_security_credentials.private_pem_path,
            public_pem_path: dashboard_security_credentials.public_pem_path
        },
        captcha: {
            googleUrl: 'http://www.google.com/recaptcha/api/verify',
            privateKey: reCaptcha_credentials.secretKey,
            publicKey: reCaptcha_credentials.siteKey,
            enabled: (reCaptcha_credentials.enabled !== "false"),
            testsCode: dashboard_security_credentials.captcha_test_code
        },
        gatewayUser: {
            email: gateway_user_credentials.username,
            password: gateway_user_credentials.password
        },
        ruleEngineUser: {
            email: rule_engine_credentials.username,
            password: rule_engine_credentials.password
        }
    },
    verifyUserEmail: true,
    redis:{
        host: redis_credentials.hostname,
        password: redis_credentials.password,
        port: redis_credentials.port
    },
    postgres: {
        database: postgres_credentials.dbname,
        username: postgres_credentials.username,
        password: postgres_credentials.password,
        options: {
            host: postgres_credentials.hostname,
            port: postgres_credentials.port,
            dialect: 'postgres',
            pool: {
                max: 12,
                min: 0,
                idle: 10000
            }
        }
    },
    mail:{
        from: 'OISP <' + mail_user_credentials.sender + '>',
        smtp: {
            transport: "SMTP",
            host: mail_credentials.host,
            secureConnection: (mail_credentials.protocol === 'smtps'),
            port: mail_credentials.port,
            requiresAuth: true,
            auth: {
                user: mail_credentials.username,
                pass: mail_credentials.password
            },
            tls:{
                secureProtocol: "TLSv1_method"
            }
        },
        footer:"",
        blockedDomains: [ "@example.com", "@test.com" ]
    },
    drsProxy: {
        url: backend_credentials.host,
        dataUrl: backend_credentials.host,
        strictSsl: false,
        mqtt: {
            host: '',
            port: 8883,
            qos: 1,
            retain: false,
            secure: true,
            retries: 30,
            username: "",
            password : ""
        },
        kafka: {
            hosts: kafka_credentials.hosts,
            topics: kafka_credentials.topics
        },
        ingestion: 'REST',
        userScheme: null // default
    },
    controlChannel: {
        mqtt: {
            host: "",
            port: "",
            qos: 1,
            retain: false,
            secure: false,
            retries: 30,
            topic: "device/{gatewayId}/control",
            username: "",
            password : ""
        },
        ws: {
            retryTime: 3000,
            retriesLimit: 5,
            secure: true,
            username: websocket_credentials.username,
            password : websocket_credentials.password,
            verifyCert: false
        }
    },
    logger: {
        transport: {
            console: {
                handleExceptions: true,
                json: false,
                colorize: true,
                prettyPrint: false,
                timestamp: true,
                exitOnError: false
            }
        },
        "logLevel": "info", //Default verbosity,
        "maxLines": 30
    },
    login : {
        maxUnsuccessfulAttempts: 10,
        lockIntervalLength: 30, //In seconds
        lockLivePeriod : 86400 //In seconds - 24h
    },
    rateLimit: 25000, // Limit of requests to API per route and method per hour
    actuation : {
        TTL: 86400, //In seconds - 24h
        limitPerRequest: 1000 //max number of actuations which can be returned by rest api
    },
    interactionTokenGenerator: {
        permissionKey: dashboard_security_credentials.interaction_token_permision_key
    }
};

/* override for local development if NODE_ENV is defined to local */
if (process.env.NODE_ENV && (process.env.NODE_ENV.toLowerCase().indexOf("local") !== -1)) {
    config.api.forceSSL = false;
    config.auth.captcha.enabled = false;

    //config.mail.smtp.requiresAuth = false;
    //config.mail.smtp.auth = undefined;

    //config.redis = {};

    // config.logger.transport.console.json = false;
    // config.logger.transport.console.prettyPrint = false;
    // config.logger.transport.console.logstash = false;
    // config.logger.logLevel = 'debug';
    // config.logger.maxLines = 60000;

    config.controlChannel.ws.secure = false;
}


module.exports = config;
