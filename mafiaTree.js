/**
 * Created by vitaliyomelkin on 08.01.14.
 */

;(function(){

    /**
     * Function which returns an object with
     * all functionality and configs
     *
     * @returns {Object}
     */
    var mafiaWatch = function() {
        return {

            // configs
            options: {
                bigNumber: 50
            },
            list: null,

            /**
             * ---------------------
             *      Main API
             * ---------------------
             */

            // initialize the object with custom configs (if any)
            init: function(options) {
                var property;
                for (property in options) {
                    if (options.hasOwnProperty(property)) {
                        this.options[property] = options[property];
                    }
                }
            },

            // load full list to memory store
            loadList: function(list) {
                this.list = Array.isArray(list) ? list : [];
            },

            // insert a new member to mafia list
            insertMemberToList: function(newMember) {
                // simple insert (without validation)
                this.list.push(newMember);
            },

            // indicates if the mob member has more then <bigNumber> subordinates
            isBigBoss: function(memberId) {
                return this._getSubordinates(memberId).length > this.options.bigNumber;
            },

            // removes the mob member from the structure and redirect his subordinates
            // to proper acting mob member
            removeMember: function(memberId) {
                this._remove(memberId);
            },

            // restore mob member within the structure and return his previous team
            // into his control
            restoreMember: function(memberId) {
                this._restore(memberId);
            },

            // indicates which mob member has more subordinates (who is more ranked)
            compareMobs: function(id1, id2) {
                return this._getSubordinates(id1).length > this._getSubordinates(id1).length ? id1 : id2;
            },




            /**
             * ------------------------
             *  Private functionality
             * ------------------------
             */

            /**
             *  Remove methods
             */

            _remove: function(memberId) {
                var replacer = this._selectReplacement(memberId);
                var ids = this._directSubordinates(memberId)
                    .map(function(item) {
                        return item.id;
                    });
                this.list.forEach(function(el) {
                    // we found reference to desired person in the main list
                    if (el.id === memberId) {
                        this._handleRemovingItem(el, replacer.id, ids);
                        this._redirectOrphanTeam(replacer.id, ids);
                    }
                }.bind(this));
            },

            // mark boss as 'out' (and store some tech data)
            _handleRemovingItem: function(el, newBossId, ids) {
                el.active = false;
                el.replacedTeamIds = ids;
                el.replacedBy = newBossId;
            },

            // redirect the team from one boss to another
            _redirectOrphanTeam: function(newBossId, ids) {
                this.list.forEach(function(el) {
                    if (ids.indexOf(el.id) !== -1 && el.bossId !== el.replacedBoss) {
                        el.bossId = newBossId;
                    }
                }.bind(this));
            },



            /**
             *  Restoration methods
             */

            _restore: function(memberId) {
                var record = this._getMemberById(memberId);
                var ids = record.replacedTeamIds;
                this.list.forEach(function(el) {
                    // we found reference to desired person in the main list
                    if (el.id === memberId) {
                        this._redirectTeam(record.id, ids);
                        this._handleRestoringItem(el);
                    }
                }.bind(this));
            },

            _handleRestoringItem: function(el) {
                el.active = true;
                el.replacedTeamIds = [];
                el.replacedBy = 0;
            },

            _redirectTeam: function(oldBossId, ids) {
                this.list.forEach(function(el) {
                    if (ids.indexOf(el.id) !== -1) {
                        el.bossId = oldBossId;
                        if (el.replacedBoss) el.replacedBoss = null;
                    }
                }.bind(this));
            },



            /**
             *  Replacement methods
             */

            // Returns a member to be used a replacement
            _selectReplacement: function(memberId) {
                var downLevel;
                var sameLevel = this._getSameLevelReplacement(memberId);
                if (sameLevel && sameLevel.id) {
                    return sameLevel;
                } else {
                    downLevel = this._getDownLevelReplacement(memberId);
                    downLevel.bossId = this._getMemberById(memberId).bossId;
                    downLevel.replacedBoss = memberId;
                    return downLevel;
                }
            },

            // get an oldest mob member of the same level
            _getSameLevelReplacement: function(memberId) {
                var item = this._getMemberById(memberId);
                if (!item) return {};
                return this._getReplacement(item.bossId, memberId);
            },

            // get an oldest mob member of the down level
            _getDownLevelReplacement: function(memberId) {
                return this._getReplacement(memberId);
            },

            // get a generic replacement
            _getReplacement: function(bossId, removingId) {
                var subs;
                subs = this._directSubordinates(bossId);

                return subs.filter(function(el){
                    // filter out the removing member
                    return el.id !== removingId;
                }).sort(function(a, b) {
                        // selecting oldest one from the rest
                        return b.age - a.age;
                    })[0];
            },


            /**
             *  Subordinates methods
             */

            // get all subordinates of the mob member
            // <selectAll> indicates to select all members (both active and inactive)
            _getSubordinates: function(memberId, selectAll) {
                var iterator = function(id, subs) {
                    var subList = this._directSubordinates(id, selectAll);
                    if (subList.length) {
                        subList.forEach(function(el) {
                            subs.push(el);
                            iterator(el.id, subs);
                        });
                    }
                    return subs;
                }.bind(this);

                return iterator(memberId, []);
            },

            // check if the node (mafia member) has direct subordinates
            // return: array
            _directSubordinates: function(memberId, selectAll) {
                if (this._noList()) {
                    console.warn('There is no list loaded');
                    return [];
                }

                return this.list.filter(function(el) {
                    if (selectAll) {
                        // selecting all members (including removed ones)
                        return el.bossId === memberId;
                    } else {
                        // selecting active members only
                        return el.bossId === memberId && el.active;
                    }

                })
            },


            /**
             *  Misc private methods
             */

            _getMemberById: function(memberId) {
                var res = this.list.filter(function(el) {
                    return el.id === memberId;
                });

                if (Array.isArray(res) && res.length) {
                    return res[0];
                } else {
                    return false;
                }
            },

            // check if the list loaded
            _noList: function() {
                return !this.list || !this.list.length || !Array.isArray(this.list);
            }
        };
    };

    /**
     *  Mock array of Mafia structure
     *
     * @type {*[]}
     */
    var mafiaListMock = [

        // Big Boss
        {
            id: 1,
            bossId: 0,
            name: 'Big Boss',
            age: 65,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },

        // Teams' leaders
        {
            id: 2,
            bossId: 1,
            name: 'Tony',
            age: 70,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },
        {
            id: 3,
            bossId: 1,
            name: 'Garry',
            age: 51,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },{
            id: 4,
            bossId: 1,
            name: 'Sanny',
            age: 52,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },
        {
            id: 5,
            bossId: 1,
            name: 'Sam',
            age: 53,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },

        // Tony's team (id: 2)
        {
            id: 6,
            bossId: 2,
            name: 'Peter',
            age: 40,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },
        {
            id: 7,
            bossId: 2,
            name: 'TM2_2',
            age: 41,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },
        {
            id: 8,
            bossId: 2,
            name: 'TM2_3',
            age: 42,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },
        {
            id: 9,
            bossId: 2,
            name: 'TM2_4',
            age: 40,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },

        // Garry's team (id: 3)
        {
            id: 10,
            bossId: 3,
            name: 'TM3_1',
            age: 38,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },
        {
            id: 11,
            bossId: 3,
            name: 'TM3_2',
            age: 39,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },
        {
            id: 12,
            bossId: 3,
            name: 'TM3_3',
            age: 40,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },
        {
            id: 13,
            bossId: 3,
            name: 'TM3_4',
            age: 40,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },
        {
            id: 14,
            bossId: 3,
            name: 'TM3_5',
            age: 41,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },
        {
            id: 15,
            bossId: 3,
            name: 'TM3_6',
            age: 42,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },


        // Peter's sub-team (id: 6)
        {
            id: 16,
            bossId: 6,
            name: 'TM6_1',
            age: 27,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },
        {
            id: 17,
            bossId: 6,
            name: 'TM6_2',
            age: 28,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        },

        // Sam's sub-team (id: 5)
        {
            id: 18,
            bossId: 5,
            name: 'TM5_1',
            age: 31,
            active: true,
            replacedBy: 0,
            replacedTeamIds: []
        }
    ];

    /**
     *  Using example (some testing)
     */
    var mafia = mafiaWatch(); // get the object
    mafia.loadList(mafiaListMock); // load mafia list
    console.log(mafia._getSubordinates(5)); // check Sam's subordinates (1)
    mafia._remove(2);                       // remove Tony from the structure, and redirect his team to Sam
    console.log(mafia._getSubordinates(5)); // check renewed Sam's team
    mafia._restore(2);                      // restore Tony in the structure
    console.log(mafia._getSubordinates(5)); // Sam is having his old team (Tony's team moved back to him)

}());