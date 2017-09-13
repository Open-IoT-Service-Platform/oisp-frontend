
# Copyright (c) 2017, Intel Corporation

# Redistribution and use in source and binary forms, with or without modification,
# are permitted provided that the following conditions are met:

#     * Redistributions of source code must retain the above copyright notice,
#       this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above copyright notice,
#       this list of conditions and the following disclaimer in the documentation
#       and/or other materials provided with the distribution.

# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
# ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
# ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
# ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


SCHEMA_PATH  = ../../lib/schema-validator/schemas
SCHEMA_FILES = $(wildcard ${SCHEMA_PATH}/*.json)
ERRORS_FILE  = ../../engine/res/errors.js
RAML_FILES   = $(wildcard *.raml)
HTML_FILE    = api.html
RAML2HTML    = ./node_modules/raml2html/bin/raml2html


%.html: %.raml
	${RAML2HTML} -v $(HTML_FILE:.html=.raml) > ${HTML_FILE}

.init:
	@$(call msg,"Initializing ...");
	@mkdir -p build
	@npm install
	@touch $@

${HTML_FILE}: .init .create_schemas .create_error_files $(TARGET:.html=.raml) ${RAML_FILES}

.create_schemas: ${SCHEMA_FILES}
	@$(call msg,"Creating Schema files ...");
	node ./extract_schemas.js ${SCHEMA_FILES}
	@touch $@

.create_error_files: ${ERRORS_FILE}
	@$(call msg,"Creating Error files ...");
	node ./extract_errors.js
	@touch $@


all: ${HTML_FILE}

clean:
	@$(call msg,"Cleaning ..."); 
	@rm -f .init .create_schemas *.html .create_error_files
	@rm -rf build
	@rm -f ../../dashboard/public/api.html

install: ${HTML_FILE}
	cp api.html ../../dashboard/public

distclean: clean




#----------------------------------------------------------------------------------------------------------------------
# helper functions
#----------------------------------------------------------------------------------------------------------------------
define msg
	tput setaf 2 && \
	for i in $(shell seq 1 120 ); do echo -n "-"; done; echo -n "\n" && \
	echo "\t"$1 && \
	for i in $(shell seq 1 120 ); do echo -n "-"; done; echo "\n" && \
	tput sgr0
endef

