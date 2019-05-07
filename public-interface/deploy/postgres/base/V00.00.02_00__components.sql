-----------------------------------------------------------------------------
--  Copyright (c) 2014 Intel Corporation
--
--  Licensed under the Apache License, Version 2.0 (the "License");
--  you may not use this file except in compliance with the License.
--  You may obtain a copy of the License at
--
--      http://www.apache.org/licenses/LICENSE-2.0
--
--  Unless required by applicable law or agreed to in writing, software
--  distributed under the License is distributed on an "AS IS" BASIS,
--  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
--  See the License for the specific language governing permissions and
--  limitations under the License.
-----------------------------------------------------------------------------

--create default components catalog
CREATE OR REPLACE FUNCTION dashboard.create_clark_component_catalog()
RETURNS void
AS $$
DECLARE
    components varchar[];
    temp varchar[];
    numeric_max varchar;
    numeric_min varchar;
    powerswitch_command varchar;
BEGIN

    numeric_max := '1.7976931348623157e+308';
    numeric_min := '-1.7976931348623157e+308';
    powerswitch_command := '{"commandString" : "LED.v1.0","parameters" : [{"name" : "LED","values" : "0,1","display" : "switcher"}]}';

    --                  ['componentTypeId', 'dimension',    'display', 'format',   'measureunit', 'version, 'type, 'dataType',   'min',        'max',      cmd]
    components := array[['temperature.v1.0', 'temperature', 'timeSeries', 'float', 'Degrees Celsius', '1.0', 'sensor', 'Number', numeric_min , numeric_max, NULL ],
                          ['humidity.v1.0', 'humidity', 'timeSeries', 'float', 'Percent (%)', '1.0', 'sensor', 'Number', NULL, NULL, NULL  ],
                          ['powerswitch.v1.0', 'powerswitch', 'Binary', 'boolean', NULL, '1.0', 'actuator', 'Boolean', NULL, NULL, powerswitch_command]];

    FOREACH temp SLICE 1 IN ARRAY components
     LOOP
        BEGIN

            EXECUTE 'INSERT INTO "dashboard"."componentTypes" (
                                            "id",
                                            "componentTypeId",
                                            "dimension",
                                            "default",
                                            "display",
                                            "format",
                                            "measureunit",
                                            "version",
                                            "type",
                                            "dataType",
                                            "min",
                                            "max",
                                            "created",
                                            "updated",
                                            "command")
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)'
                USING
                    md5(temp[1])::uuid,
                    temp[1],
                    COALESCE(temp[2], 'flag'),
                    true,
                    COALESCE(temp[3], 'timeSeries') ,
                    COALESCE(temp[4], 'integer'),
                    temp[5],
                    COALESCE(temp[6], '1.0'),
                    COALESCE(temp[7],'sensor')::"dashboard"."enum_componentTypes_type",
                    COALESCE(temp[8], 'Number'),
                    temp[9]::decimal,
                    temp[10]::decimal,
                    now(),
                    now(),
                    temp[11]::JSON;
            RAISE NOTICE 'Created: %', temp[1];
        EXCEPTION WHEN unique_violation THEN
            RAISE NOTICE 'Not Created, component exists: %', temp[1];
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT * from dashboard.create_clark_component_catalog();