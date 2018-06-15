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

'use strict';

var path = require('path'),
    templatesDir = path.resolve(__dirname, '..', 'templates'),
    emailTemplates = require('email-templates'),
    nodemailer = require('nodemailer'),
    config = require('../config'),
    logger = require('./logger').init();

var sendMail = function (templateName, params, smtpConfig) {
    emailTemplates(templatesDir, function(err, template) {
        if (err) {
            logger.error('mailer. send, error getting templates: ' + JSON.stringify(err));
        } else {
            
            console.log(JSON.stringify(smtpConfig,null,"\t"))
            var transport = nodemailer.createTransport(smtpConfig);

            params.footer = config.mail.footer;

            template(templateName, params, function(err, html, text) {
                if (err) {
                    logger.error('mailer. send, error getting template ' + templateName + ': ' + JSON.stringify(err));
                } else {
                    var mail = {
                        from: config.mail.from,
                        to: params.email,
                        subject: params.subject || templateName,
                        html: html,
                        text: text
                    };
                    var shouldBeBlocked = false;
                    config.mail.blockedDomains.some(function(blockedDomain) {
                        if(params.email.indexOf(blockedDomain) > 0) {
                            shouldBeBlocked = true;
                            return true;
                        }
                    });
                    if (params.email.split("@").length !== 2){
                        shouldBeBlocked = true;
                    } else if (params.email.split("@")[1].indexOf(".") < 1) {
                        shouldBeBlocked = true;
                    }

                    if(shouldBeBlocked) {
                        logger.info('Email to ' + params.email + ' was blocked and not sent.');
                        return;
                    } else {
                        logger.info('Sending email to: ' + params.email);
                    }

                    if (params.attachments) {
                        mail.attachments = params.attachments;
                    }
                    transport.sendMail(mail, function(err, responseStatus) {
                        if (err) {
                            logger.error(JSON.stringify(err));
                        } else {
                            logger.info(JSON.stringify(responseStatus.message));
                            if (process.env.TEST && (process.env.TEST.toLowerCase().indexOf("1") !== -1)) {
                                console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
                            }
                        }
                    });
                }
            });
        }
    });
}

module.exports = {
    send: function(templateName, params) {
        
        if (process.env.TEST && (process.env.TEST.toLowerCase().indexOf("1") !== -1)) {
            nodemailer.createTestAccount((err, account) => {
                if (err) {
                    logger.error('Failed to create a testing account. ' + err.message);
                }
                else {
                    var smtpConfig = {};

                    smtpConfig.host = account.smtp.host;
                    smtpConfig.port = account.smtp.port,
                    smtpConfig.secure = account.smtp.secure,
                    smtpConfig.auth =  {
                        user: account.user,
                        pass: account.pass
                    }

                    // sendMail(templateName, params, smtpConfig) TODO : next step 
                    sendMail(templateName, params, config.mail.smtp)

                }
            });
        }
        else {
            sendMail(templateName, params, config.mail.smtp)
        }
        
    }
};
