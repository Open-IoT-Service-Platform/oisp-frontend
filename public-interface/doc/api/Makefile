
#
# Copyright (c) 2017 Intel Corporation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


SCHEMA_PATH  = ../../lib/schema-validator/schemas
SCHEMA_FILES = $(wildcard ${SCHEMA_PATH}/*.json)
ERRORS_FILE  = ../../engine/res/errors.js
RAML_FILES   = $(wildcard *.raml)
RAML_BUILD_FILES = $(patsubst %.raml,build/%.raml,${RAML_FILES})  
HTML_FILE    = api.html
RAML2HTML    = ./node_modules/raml2html/bin/raml2html


%.html: %.raml
	${RAML2HTML} -v $(HTML_FILE:.html=.raml) > ${HTML_FILE}

.init:
	@$(call msg,"Initializing ...");
	@mkdir -p build
	@npm install
	@touch $@

${HTML_FILE}: .init .create_schemas .create_error_files $(TARGET:.html=.raml) ${RAML_BUILD_FILES}

.create_schemas: ${SCHEMA_FILES}
	@$(call msg,"Creating Schema files ...");
	node ./extract_schemas.js ${SCHEMA_FILES}
	@touch $@

.create_error_files: ${ERRORS_FILE}
	@$(call msg,"Creating Error files ...");
	node ./extract_errors.js
	@touch $@


build/%.raml: %.raml
	@$(call msg,"Inserting roles in RAML files ...");
	node ./extract_roles.js $<

all: ${HTML_FILE}

clean:
	@$(call msg,"Cleaning ..."); 
	@rm -f .init .create_schemas *.html .create_error_files .extract_roles
	@rm -rf build
	@rm -f ../../dashboard/public/api.html

install: ${HTML_FILE}
	cp api.html ../../dashboard/public

distclean: clean

test: clean all
	@tput setaf 2 && echo -n "Success:" && tput sgr0 && echo " Built API successfully."
	@echo "Test whether meta-tags processed properly."
	@if (grep "<meta name=" build/*.raml) \
		then \
			tput setaf 1 && echo -n "Fail:" && tput sgr0 && echo " <meta> tags still found in processed *.raml files"; exit 1; \
			else tput setaf 2 && echo -n "Success:" && tput sgr0 && echo " Test successful: No <meta> tags found in raml files";\
	fi
	@echo "Test whether ${HTML_FILE} contains something."
	@if [ ! -s ${HTML_FILE} ]; \
		then \
			rm ${HTML_FILE};\
			tput setaf 1 && echo -n "Fail:" &&  tput sgr0 && echo " HTML file empty";\
			exit 1; \
		else tput setaf 2 && echo -n "Success:" && tput sgr0 && echo " HTML file size non-zero";\
	fi

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

