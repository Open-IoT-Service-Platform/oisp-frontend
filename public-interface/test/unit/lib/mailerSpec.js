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
var expect = require('expect.js'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    mailerManager = rewire('../../../lib/mailer');

describe("Mailer tests", function(){

    var emailTemplatesMock,
        nodemailerMock,
        templateMock,
        transportMock,
        config,
        templatesDir = 'templates',
        templateName = 'activateUser',
        html = '<html></html>',
        text = 'text',
        params;

    beforeEach(function() {
        emailTemplatesMock = sinon.stub();

        nodemailerMock = {
            createTransport: sinon.stub()
        };
        templateMock = sinon.stub();
        transportMock = {
            sendMail: sinon.stub()
        };
        config = {
            mail: {
                from: 'OISP - Intel(r) Corporation <sysadmin@us.enableiot.com>',
                smtp: {
                    transport: "SMTP",
                    host: "localhost",
                    secureConnection: false,
                    port: 587,
                    requiresAuth: true,
                    auth: {
                        user: "user",
                        pass: "pass"
                    },
                    tls: {
                        secureProtocol: "TLSv1_method"
                    }
                },
                blockedDomains: [ "@example.com", "@test.com", "@agent-observer.com" ]
            }
        };
        params = {
            email: 'test@not-blocked.com',
            subject: 'Topic'
        };

        mailerManager.__set__('emailTemplates', emailTemplatesMock);
        mailerManager.__set__('nodemailer', nodemailerMock);
        mailerManager.__set__('config', config);
    });

    var validateEmailTemplateIsCalledWithCorrectArgs = function () {
        expect(emailTemplatesMock.calledOnce).to.equal(true);
        expect(emailTemplatesMock.args[0].length).to.equal(2);
        expect(emailTemplatesMock.args[0][0].match(templatesDir + '$')[0]).to.equal(templatesDir);
    };

    var validateNodeMailerIsCalledWithCorrectArgs = function () {
        expect(nodemailerMock.createTransport.calledOnce).to.equal(true);
        expect(nodemailerMock.createTransport.args[0].length).to.equal(2);
        expect(nodemailerMock.createTransport.args[0][0]).to.equal('SMTP');
        expect(JSON.stringify(nodemailerMock.createTransport.args[0][1])).to.equal(JSON.stringify(config.mail.smtp));
    };

    var validateTemplateIsCalledWithCorrectArgs = function () {
        expect(templateMock.calledOnce).to.equal(true);
        expect(templateMock.args[0].length).to.equal(3);
        expect(templateMock.args[0][0]).to.equal(templateName);
        expect(templateMock.args[0][1]).to.equal(params);
    };

    var validateMailContent = function() {
        expect(transportMock.sendMail.args[0].length).to.equal(2);
        expect(transportMock.sendMail.args[0][0].from).to.equal(config.mail.from);
        expect(transportMock.sendMail.args[0][0].to).to.equal(params.email);
        expect(transportMock.sendMail.args[0][0].subject).to.equal(params.subject);
        expect(transportMock.sendMail.args[0][0].html).to.equal(html);
        expect(transportMock.sendMail.args[0][0].text).to.equal(text);
    };

    it('Should send email', function(done){
        emailTemplatesMock.callsArgWith(1, null, templateMock);
        nodemailerMock.createTransport.returns(transportMock);
        templateMock.callsArgWith(2, null, html, text);
        transportMock.sendMail.callsArgWith(1, null, 200);

        mailerManager.send(templateName, params);

        validateEmailTemplateIsCalledWithCorrectArgs();
        validateNodeMailerIsCalledWithCorrectArgs();
        validateTemplateIsCalledWithCorrectArgs();
        expect(transportMock.sendMail.calledOnce).to.equal(true);
        validateMailContent();

        done();
    });

    it('Should use template name as subject if not provided', function(done){
        params.subject = undefined;

        emailTemplatesMock.callsArgWith(1, null, templateMock);
        nodemailerMock.createTransport.returns(transportMock);
        templateMock.callsArgWith(2, null, html, text);
        transportMock.sendMail.callsArgWith(1, null, 200);

        mailerManager.send(templateName, params);

        validateEmailTemplateIsCalledWithCorrectArgs();
        validateNodeMailerIsCalledWithCorrectArgs();
        validateTemplateIsCalledWithCorrectArgs();
        expect(transportMock.sendMail.calledOnce).to.equal(true);
        expect(transportMock.sendMail.args[0].length).to.equal(2);
        expect(transportMock.sendMail.args[0][0].from).to.equal(config.mail.from);
        expect(transportMock.sendMail.args[0][0].to).to.equal(params.email);
        expect(transportMock.sendMail.args[0][0].subject).to.not.equal(params.subject);
        expect(transportMock.sendMail.args[0][0].subject).to.equal(templateName);
        expect(transportMock.sendMail.args[0][0].html).to.equal(html);
        expect(transportMock.sendMail.args[0][0].text).to.equal(text);

        done();
    });

    it('Should block email if domain is on blocked domains list', function(done){
        params.email = 'test@example.com';

        emailTemplatesMock.callsArgWith(1, null, templateMock);
        nodemailerMock.createTransport.returns(transportMock);
        templateMock.callsArgWith(2, null, html, text);

        mailerManager.send(templateName, params);

        validateEmailTemplateIsCalledWithCorrectArgs();
        validateNodeMailerIsCalledWithCorrectArgs();
        validateTemplateIsCalledWithCorrectArgs();
        expect(transportMock.sendMail.calledOnce).to.equal(false);

        done();
    });

    it('Should block email if is has more than one @', function(done){
        params.email = 'test@example.com@test.com';

        emailTemplatesMock.callsArgWith(1, null, templateMock);
        nodemailerMock.createTransport.returns(transportMock);
        templateMock.callsArgWith(2, null, html, text);

        mailerManager.send(templateName, params);

        validateEmailTemplateIsCalledWithCorrectArgs();
        validateNodeMailerIsCalledWithCorrectArgs();
        validateTemplateIsCalledWithCorrectArgs();
        expect(transportMock.sendMail.calledOnce).to.equal(false);

        done();
    });

    it('Should block email if is has incorrect domain', function(done){
        params.email = 'test@.com';

        emailTemplatesMock.callsArgWith(1, null, templateMock);
        nodemailerMock.createTransport.returns(transportMock);
        templateMock.callsArgWith(2, null, html, text);

        mailerManager.send(templateName, params);

        validateEmailTemplateIsCalledWithCorrectArgs();
        validateNodeMailerIsCalledWithCorrectArgs();
        validateTemplateIsCalledWithCorrectArgs();
        expect(transportMock.sendMail.calledOnce).to.equal(false);

        done();
    });

    it('Should include attachment in email if provided in params', function(done){
        params.attachments = [ 'attachment' ];

        emailTemplatesMock.callsArgWith(1, null, templateMock);
        nodemailerMock.createTransport.returns(transportMock);
        templateMock.callsArgWith(2, null, html, text);
        transportMock.sendMail.callsArgWith(1, null, 200);

        mailerManager.send(templateName, params);

        validateEmailTemplateIsCalledWithCorrectArgs();
        validateNodeMailerIsCalledWithCorrectArgs();
        validateTemplateIsCalledWithCorrectArgs();
        expect(transportMock.sendMail.calledOnce).to.equal(true);
        validateMailContent();
        expect(transportMock.sendMail.args[0][0].attachments[0]).to.equal(params.attachments[0]);

        done();
    });

    it('Should not include attachment in email if not provided in params', function(done){
        emailTemplatesMock.callsArgWith(1, null, templateMock);
        nodemailerMock.createTransport.returns(transportMock);
        templateMock.callsArgWith(2, null, html, text);
        transportMock.sendMail.callsArgWith(1, null, 200);

        mailerManager.send(templateName, params);

        validateEmailTemplateIsCalledWithCorrectArgs();
        validateNodeMailerIsCalledWithCorrectArgs();
        validateTemplateIsCalledWithCorrectArgs();
        expect(transportMock.sendMail.calledOnce).to.equal(true);
        validateMailContent();
        expect(transportMock.sendMail.args[0][0].attachments).to.equal(undefined);

        done();
    });

    it('Should not send email if template is not found', function(done){
        var templateError = {
            message: 'Template not found'
        };

        emailTemplatesMock.callsArgWith(1, null, templateMock);
        nodemailerMock.createTransport.returns(transportMock);
        templateMock.callsArgWith(2, templateError);

        mailerManager.send(templateName, params);

        validateEmailTemplateIsCalledWithCorrectArgs();
        validateNodeMailerIsCalledWithCorrectArgs();
        validateTemplateIsCalledWithCorrectArgs();
        expect(transportMock.sendMail.called).to.equal(false);

        done();
    });

    it('Should not send email if template dir is not found', function(done){
        var templatesError = {
            message: 'Template directory not found'
        };

        emailTemplatesMock.callsArgWith(1, templatesError, templateMock);

        mailerManager.send(templateName, params);

        validateEmailTemplateIsCalledWithCorrectArgs();
        expect(templateMock.called).to.equal(false);

        done();
    });

});
