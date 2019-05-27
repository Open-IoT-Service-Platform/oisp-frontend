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

// Gets the config for the configName from the OISP_FRONTEND_CONFIG environment variable
// Returns empty object if the config can not be found
var getOISPConfig = (function () {
	if (!process.env.OISP_FRONTEND_CONFIG) {
		console.log("Root config environment variable (OISP_FRONTEND_CONFIG) is missing...");
		return function () { return {}; };
	}
	var frontendConfig = JSON.parse(process.env.OISP_FRONTEND_CONFIG);

	var resolveConfig = function (config, stack) {
		if (!stack) {
			stack = ["OISP_FRONTEND_CONFIG"];
		}
		for (var property in config) {
			if (typeof config[property] === "string" &&
					(config[property].substring(0,2) === "@@" || config[property].substring(0,2) === "%%")) {
				var configName = config[property].substring(2, config[property].length);
				if (!process.env[configName]) {
					console.log("Config environment variable (" + configName + ") is missing...");
					config[property] = {};
				} else if (stack.indexOf(configName) !== -1) {
					console.log("Detected cyclic reference in config decleration: " + configName + ", stopping recursion...");
					config[property] = {};
				} else {
					config[property] = JSON.parse(process.env[configName]);
					stack.push(configName);
					resolveConfig(config[property], stack);
					stack.pop();
				}
			}
		}
	};

	resolveConfig(frontendConfig);

	return function(configName) {
			if (!frontendConfig[configName] && frontendConfig[configName] !== false)
				return {};
			else {
				console.log(configName + " is set to: " + JSON.stringify(frontendConfig[configName]));
				return frontendConfig[configName];
			}
		};
})();

var postgres_config = getOISPConfig("postgresConfig"),
    backendHost_config = getOISPConfig("backendHostConfig"),
    smtp_config = getOISPConfig("smtpConfig"),
    mail_config = getOISPConfig("mailConfig"),
    websocketUser_config = getOISPConfig("websocketUserConfig"),
    recaptcha_config = getOISPConfig("recaptchaConfig"),
    redis_config = getOISPConfig("redisConfig"),
    ruleEngine_config = getOISPConfig("ruleEngineConfig"),
    gateway_config = getOISPConfig("gatewayConfig"),
    dashboardSecurity_config = getOISPConfig("dashboardSecurityConfig")
    kafka_config = getOISPConfig("kafkaConfig"),
    jaeger_enabled = getOISPConfig("jaegerTracing"),
    winston = require('winston');

// Get replica information from the postgres config,
// Done this way to avoid compatibility problems with other services
var postgresReadReplicas = [],
    postgresWriteConf = {};

if (postgres_config.readReplicas) {
	postgresReadReplicas = postgres_config.readReplicas;
} else if (postgres_config.readHostname) {
	postgresReadReplicas.push({
		host: postgres_config.readHostname,
		port: postgres_config.readPort
	});
} else {
	// Use default db config as read
	postgresReadReplicas.push({});
}

if (postgres_config.writeHostname) {
	postgresWriteConf = {
		host: postgres_config.writeHostname,
		port: postgres_config.writePort
	};
}

var config = {
    api: {
        forceSSL: true,
        port: process.env.PORT || 4001,
        socket: 1024,
        bodySizeLimit: '2560kb'
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
            private_pem_path: dashboardSecurity_config.private_pem_path,
            public_pem_path: dashboardSecurity_config.public_pem_path
        },
        captcha: {
            googleUrl: 'http://www.google.com/recaptcha/api/verify',
            privateKey: recaptcha_config.secretKey,
            publicKey: recaptcha_config.siteKey,
            enabled: (recaptcha_config.enabled !== "false"),
            testsCode: dashboardSecurity_config.captcha_test_code
        },
        gatewayUser: {
            email: gateway_config.username,
            password: gateway_config.password
        },
        ruleEngineUser: {
            email: ruleEngine_config.username,
            password: ruleEngine_config.password
        }
    },
    verifyUserEmail: true,
    redis:{
        host: redis_config.hostname,
        password: redis_config.password,
        port: redis_config.port
    },
    postgres: {
        database: postgres_config.dbname,
        su_username: postgres_config.username,
        su_password: postgres_config.password,
        username: 'oisp_user',
        password: 'supersecret',
        options: {
            host: postgres_config.hostname,
            port: postgres_config.port,
            dialect: 'postgres',
            databaseVersion: '9.4.21',
            replication: {
                read: postgresReadReplicas,
                write: postgresWriteConf
            },
            pool: {
                max: 12,
                min: 0,
                idle: 10000
            }
        }
    },
    mail:{
        from: 'OISP <' + mail_config.sender + '>',
        smtp: {
            transport: "SMTP",
            host: smtp_config.host,
            secureConnection: (smtp_config.protocol === 'smtps'),
            port: smtp_config.port,
            requiresAuth: true,
            auth: {
                user: smtp_config.username,
                pass: smtp_config.password
            },
            tls:{
                secureProtocol: "TLSv1_method"
            }
        },
        footer:"",
        blockedDomains: [ "@example.com", "@test.com" ]
    },
    drsProxy: {
        url: backendHost_config.host,
        dataUrl: backendHost_config.host,
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
            uri: kafka_config.uri,
            topicsObservations: kafka_config.topicsObservations,
            topicsRuleEngine: kafka_config.topicsRuleEngine,
            topicsHeartbeatName: kafka_config.topicsHeartbeatName,
            topicsHeartbeatInterval: kafka_config.topicsHeartbeatInterval
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
            username: websocketUser_config.username,
            password : websocketUser_config.password,
            verifyCert: false
        }
    },
    logger: {
        level: 'info', //Default verbosity,
    	format: winston.format.combine(
    	        winston.format.colorize(),
    	        winston.format.timestamp(),
    	        winston.format.printf(info => { return `${info.timestamp}-${info.level}: ${info.message}`; })
    	     ),
        frontendTransports: [new winston.transports.Console({ handleExceptions: true })],
        httpTransports: [new winston.transports.Console({ handleExceptions: true })],
        exitOnError: false,
        maxLines: 30
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
        permissionKey: dashboardSecurity_config.interaction_token_permision_key
    },
    jaeger : {
        serviceName: 'frontend',
        agentHost: process.env.DASHBOARD_SERVICE_HOST ? 'localhost' : 'jaeger',
        agentPort: 6832,
        logSpans: true,
        samplerType: 'probabilistic',
        samplerParam: 0.1,
		tracing: jaeger_enabled
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

/* override for testing if rateLimit wants to be disabled */
if (process.argv && (process.argv.indexOf("--disable-rate-limits") !== -1)) {
	config.rateLimit = 'limitless';
}


module.exports = config;
