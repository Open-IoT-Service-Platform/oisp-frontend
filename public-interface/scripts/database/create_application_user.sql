#!/bin/bash

# Copyright (c) 2017 Intel Corporation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#    http://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -e

psql=( psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" )

"${psql[@]}" <<-EOSQL
	CREATE USER oisp_user WITH PASSWORD 'supersecure';
	GRANT ALL PRIVILEGES ON DATABASE oisp TO oisp_user;
EOSQL
for f in /docker-entrypoint-initdb.d/*.sql; do
    echo "$0: running $f"; "${psql[@]}" --dbname ${TEST_DB} -f "$f"; echo ;
done

