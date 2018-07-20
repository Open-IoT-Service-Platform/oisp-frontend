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

"use strict";

var verbs = {GET: "GET", POST: "POST", PUT: "PUT", DELETE: "DELETE"};

module.exports = [
    ["/api/health",                                 verbs.GET,          "api:public"                            ],
    ["/api/time",                                   verbs.GET,          "api:public"                            ],

    ["/api/auth/token",                             verbs.POST,         "api:public"                            ],
    ["/api/auth/tokenInfo",                         verbs.GET,          "auth:read",     600                    ],

    ["/api/data/admin/.*",                          verbs.POST,         "data:writeany", 1000000                ],
    ["/api/data/.*",                                verbs.POST,         "data:write",    36000                  ],

    ["/api/accounts/.*/data/search",                verbs.POST,         "data:read",     12000                  ],
    ["/api/accounts/.*/data/search/advanced",       verbs.POST,         "data:read",     12000                  ],
    ["/api/accounts/.*/data/report",                verbs.POST,         "data:read",     120                    ],
    ["/api/accounts/.*/data/totals",                verbs.GET,          "data:read",     1800                   ],
    ["/api/accounts/.*/data/firstLastMeasurementTimestamp", verbs.POST, "data:read",     1800                   ],
    ["/api/accounts/.*/sensorhealth/sampleratechanges", verbs.POST,     "account:read"                          ],

    ["/api/devices",                                verbs.POST,         "device:admin",  100                    ],
    ["/api/accounts/.*/devices",                    verbs.POST,         "device:admin",  100                    ],
    ["/api/accounts/.*/devices/search",             verbs.POST,         "device:read",   36000                  ],
    ["/api/accounts/.*/devices/count",              verbs.POST,         "device:read",   36000                  ],
    ["/api/accounts/.*/devices/components",         verbs.POST,         "device:read",   36000                  ],
    ["/api/devices",                                verbs.GET,          "device:read"                           ],
    ["/api/accounts/.*/devices",                    verbs.GET,          "device:read"                           ],
    ["/api/devices/.*",                             verbs.GET,          "device:read"                           ],
    ["/api/accounts/.*/devices/.*",                 verbs.GET,          "device:read"                           ],
    ["/api/devices/.*",                             verbs.PUT,          "device:admin"                          ],
    ["/api/accounts/.*/devices/.*",                 verbs.PUT,          "device:admin"                          ],
    ["/api/devices/.*/activation",                  verbs.PUT,          "api:public"                            ],
    ["/api/accounts/.*/devices/.*",                 verbs.DELETE,       "device:admin"                          ],
    ["/api/devices/register",                       verbs.POST,         "api:public"                            ],

    ["/api/devices/.*/components",                  verbs.POST,         "device:admin"                          ],
    ["/api/accounts/.*/devices/.*/components",      verbs.POST,         "device:admin"                          ],
    ["/api/devices/.*/components/.*",               verbs.DELETE,       "device:admin"                          ],
    ["/api/accounts/.*/devices/.*/components/.*",   verbs.DELETE,       "device:admin"                          ],

    ["/api/accounts/.*",                            verbs.GET,          "account:read"                          ],
    ["/api/accounts",                               verbs.POST,         "account:create",10                     ],
    ["/api/accounts/.*",                            verbs.PUT,          "account:admin", 1800                   ],
    ["/api/accounts/.*/invites/me",                 verbs.DELETE,       "account:read",  1800                   ],
    ["/api/accounts/.*/invites/.*",                 verbs.DELETE,       "account:admin", 1800                   ],
    ["/api/accounts/.*",                            verbs.DELETE,       "account:admin", 1800                   ],
    ["/api/accounts/.*",                            verbs.DELETE,       "platform:admin",1800                   ],
    ["/api/accounts/.*/control",                    verbs.POST,         "device:admin",  36000                  ],
    ["/api/accounts/.*/control/commands/.*",        verbs.POST,         "device:admin",  36000                  ],
    ["/api/accounts/.*/control/commands/.*",        verbs.PUT,          "device:admin",  36000                  ],
    ["/api/accounts/.*/control/devices/.*/",        verbs.GET,          "device:admin", 36000                   ],

    ["/api/accounts/.*/activationcode",             verbs.GET,          "account:read"                          ],
    ["/api/accounts/.*/activationcode/refresh",     verbs.PUT,          "account:read",  100                    ],
    ["/api/accounts/.*/attributes",                 verbs.PUT,          "account:write", 1800                   ],

    ["/api/accounts/.*/alerts",                     verbs.GET,          "alert:read"                            ],
    ["/api/alerts/.*",                              verbs.GET,          "alert:read"                            ],
    ["/api/accounts/.*/alerts/.*",                  verbs.GET,          "alert:read"                            ],
    ["/api/accounts/.*/alerts",                     verbs.POST,         "alert:trigger",   1000000              ],
    ["/api/alerts",                                 verbs.POST,         "alert:trigger",   1000000              ],
    ["/api/accounts/.*/alerts/.*/reset",            verbs.PUT,          "alert:write"                           ],
    ["/api/alerts/.*/reset",                        verbs.PUT,          "alert:write"                           ],
    ["/api/accounts/.*/alerts/.*/status/.*",        verbs.PUT,          "alert:write"                           ],
    ["/api/accounts/.*/alerts/.*/comments",         verbs.POST,         "alert:write"                           ],

    ["/api/accounts/.*/resets",                     verbs.POST,         "alert:write"                           ],
    ["/api/resets",                                 verbs.POST,         "alert:write"                           ],

    ["/api/accounts/.*/invites",                    verbs.GET,          "account:admin"                         ],
    ["/api/accounts/.*/invites",                    verbs.POST,         "account:admin"                         ],

    ["/api/invites/.*",                             verbs.GET,          "user:admin"                            ],
    ["/api/invites/.*/status",                      verbs.PUT,          "user:admin"                            ],

    ["/api/accounts/.*/rules",                      verbs.GET,          "account:read"                          ],
    ["/api/accounts/.*/rules/.*",                   verbs.GET,          "account:read"                          ],
    ["/api/accounts/.*/rules",                      verbs.POST,         "account:write"                         ],
    ["/api/accounts/.*/rules/clone/.*",             verbs.POST,         "account:write"                         ],
    ["/api/accounts/.*/rules/.*",                   verbs.PUT,          "account:write"                         ],
    ["/api/accounts/.*/rules/.*",                   verbs.DELETE,       "account:write"                         ],
    ["/api/rules/status/.*",                        verbs.GET,          "rules:admin"                           ],
    ["/api/accounts/.*/rules/.*/execution",         verbs.POST,         "rules:admin"                           ],

    ["/api/accounts/.*/summary/.*",                 verbs.GET,          "account:read"                          ],

    ["/api/accounts/.*/users",                      verbs.GET,          "account:admin"                         ],
    ["/api/users",                                  verbs.POST,         "user:create"                           ],
    ["/api/users/me",                               verbs.PUT,          "user:admin"                            ],
    ["/api/accounts/.*/users/me/settings.*",        verbs.POST,         "user:admin"                            ],
    ["/api/accounts/.*/users/me/settings.*",        verbs.PUT,          "user:admin"                            ],
    ["/api/accounts/.*/users/me/settings.*",        verbs.GET,          "user:admin"                            ],
    ["/api/accounts/.*/users/me/settings.*",        verbs.DELETE,       "user:admin"                            ],
    ["/api/accounts/.*/users/.*",                   verbs.PUT,          "user:admin"                            ],
    ["/api/users/me/settings.*",                    verbs.POST,         "user:admin"                            ],
    ["/api/users/me/settings.*",                    verbs.PUT,          "user:admin"                            ],
    ["/api/users/me/settings.*",                    verbs.GET,          "user:admin"                            ],
    ["/api/users/me/settings.*",                    verbs.DELETE,       "user:admin"                            ],
    ["/api/users/.*",                               verbs.GET,          "user:admin"                            ],
    ["/api/users/forgot_password",                  verbs.POST,         "api:public"                            ],
    ["/api/users/forgot_password",                  verbs.PUT,          "api:public"                            ],
    ["/api/users/forgot_password",                  verbs.GET,          "api:public"                            ],
    ["/api/users/activate",                         verbs.POST,         "api:public"                            ],
    ["/api/users/request_user_activation",          verbs.POST,         "api:public"                            ],
    ["/api/users/.*",                               verbs.PUT,          "user:admin"                            ],
    ["/api/users/.*",                               verbs.DELETE,       "user:admin"                            ],

    ["/api/accounts/.*/cmpcatalog",                 verbs.GET,          "catalog:read"                          ],
    ["/api/cmpcatalog",                             verbs.GET,          "catalog:read"                          ],
    ["/api/accounts/.*/cmpcatalog/.*",              verbs.GET,          "catalog:read"                          ],
    ["/api/cmpcatalog/.*",                          verbs.GET,          "catalog:read"                          ],
    ["/api/accounts/.*/cmpcatalog",                 verbs.POST,         "account:write"                         ],
    ["/api/accounts/.*/cmpcatalog/.*",              verbs.PUT,          "account:write"                         ],
    ["/api/accounts/.*/cmpcatalog/.*",              verbs.DELETE,       "account:admin"                         ],

    ["/dashboard",                               verbs.GET,          "ui:public"                             ],
    ["/validate",                                verbs.GET,          "ui:public"                             ],
    
    /*The endpoint /auth/me implements the login service at dashboard user interface.
      The GET method is currently implemented for the REST API as well.
      If it is needed, others can be too, to do that: Add the route here just like below,
      also specify what it will do at ../authentication.js (e.g app.put('/api/auth/me', ...))*/
    ["/api/auth/me",                                 verbs.GET,          "user:admin",    36000                  ],
    ["/auth/me",                                 verbs.GET,          "user:admin",    36000                  ],
    ["/auth/me",                                 verbs.DELETE,       "user:admin",    36000                  ],
    ["/auth/me",                                 verbs.PUT,          "user:admin",    36000                  ],
    ["/auth/.*",                                 verbs.GET,          "ui:public"                             ],
    ["/auth/.*",                                 verbs.POST,         "ui:public"                             ],
    ["/auth",                                    verbs.GET,          "ui:public"                             ],
    ["/auth/social/config",                      verbs.GET,          "ui:public"                             ],
    ["/logout",                                  verbs.GET,          "ui:public"                             ],
    ["",                                         verbs.GET,          "ui:public"                             ],
    ["/public/.*",                               verbs.GET,          "ui:public"                             ],
    ["/recaptcha",                               verbs.POST,         "ui:public"                             ],

    ["/api/test/interactionToken",               verbs.POST,         "ui:public"                             ],
    ["/google/captchakey",            verbs.GET,          "ui:public"                             ],
    ["/api/components/rules",                     verbs.POST,         "rules:admin"                           ],
    ["/api/rules/synchronization_status/.*",                verbs.PUT,          "rules:admin"           ]

];
