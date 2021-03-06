var db = require("./db");
const { Op, Sequelize } = require("sequelize");

module.exports = {
	getData: function (req, res) {				
		var qrySelect = "SELECT * FROM account";
		qrySelect += " WHERE `order` > 10";
		if (req.query.all == 0) {
			qrySelect += " AND status = 1";
			qrySelect += " AND (id in (select from_account from journal where year(date) = " + req.query.jahr + ")";
			qrySelect += " OR id in (select to_account from journal where year(date) = " + req.query.jahr + "))";
		}
		qrySelect += " ORDER BY level ASC , `order` ASC";
		sequelize.query(qrySelect, 
			{ 
				type: Sequelize.QueryTypes.SELECT,
				plain: false,
				logging: console.log,
				model: db.Account,
				raw: false
			}
		).then(data => res.json(data))
		.catch((e) => console.error(e));					
	},

	getOneData: function (req, res) {
		db.Account.findByPk(req.param.id)
			.then(data => res.json(data))
			.catch((e) => console.error(e));
	},

	getOneDataByOrder: function (req, res) {
		db.Account.count({where: {"order": req.query.order}})
			.then(data => res.json(data))
			.catch((e) => console.error(e));
	},

	getFKData: function(req, res) {
		var qrySelect = "SELECT `id`, CONCAT('<span class=\"small\">', `order`,' ',`name`, '</span>') as value";
		qrySelect += " FROM `account` WHERE `status` = 1 and `level` != `order` " ;
		if (req.query.filter != null) {
			var qfield = '%' + req.query.filter.value + '%';
			qrySelect = qrySelect + " AND lower(`name`) like '" + qfield + "'";
		}
		qrySelect = qrySelect + " ORDER BY 2";
		
		sequelize.query(qrySelect, 
			{ 
				type: Sequelize.QueryTypes.SELECT,
				plain: false,
				logging: console.log,
				raw: false
			}
		).then(data => res.json(data))
		.catch((e) => console.error(e));					
	},

	addData: function (req, res) {
		var data = req.body;
		console.info('insert: ',data);
		db.Account.create(data)
			.then((obj) => res.json(obj))
			.catch((e) => res.json({type: "error", message: e}));
	},
	
	updateData: function (req, res) {
		var data = req.body;
		console.info('update: ',data);
	
		db.Account.findByPk(data.id)
		.then((account) => account.update(data)
			.then((obj) => res.json(obj))
			.catch((e) => console.error(e)))
		.catch((e) => console.error(e));
	},

	getAccountSummary: async function (req, res) {
		var arBudget = await db.Budget.findAll({where:{'year': req.query.jahr}});

		var qrySelect = "Select ac.`id`, ac.`level`, ac.`order`, ac.`name`, sum(j.`amount`) as amount, 0 as budget, 0 as diff, ";
		qrySelect += "(CASE WHEN ac.`status`= 1 THEN '' ELSE 'inactive' END) as $css"
		qrySelect += " from account ac ";
		qrySelect += " left outer join journal j ";
		qrySelect += " on ac.id = j.from_account ";
		qrySelect += " and year(j.date) = " + req.query.jahr;
		qrySelect += " group by ac.`id`,  ac.`level`, ac.`order`, ac.`name` ";
		qrySelect += " order by ac.`level`, ac.`order`";

		sequelize.query(qrySelect, 
			{ 
				type: Sequelize.QueryTypes.SELECT,
				plain: false,
				logging: console.log,
				raw: false
			}
		).then(data => {
			qrySelect = "Select ac.`id`, ac.`level`, ac.`order`, ac.`name`, sum(j.`amount`) as amount ";
			qrySelect += " from account ac ";
			qrySelect += " join journal j ";
			qrySelect += " on ac.id = j.to_account ";
			qrySelect += " and year(j.date) = " + req.query.jahr;
			qrySelect += " group by ac.`id`,  ac.`level`, ac.`order`, ac.`name` ";
			qrySelect += " order by ac.`level`, ac.`order`";
			sequelize.query(qrySelect, 
				{ 
					type: Sequelize.QueryTypes.SELECT,
					plain: false,
					logging: console.log,
					raw: false
				}
			).then(data2 => {
				for (let ind2 = 0; ind2 < data2.length; ind2++) {
					const acc2 = data2[ind2];
					var found = data.findIndex(acc => acc.id == acc2.id);
					switch (data[found].level) {
						case 1:
						case 4:
							data[found].amount = eval(data[found].amount - acc2.amount);
							break;
						case 2:
						case 6:
							data[found].amount = eval(acc2.amount - data[found].amount);
							break;
					}				
				}

				for (let ind2 = 0; ind2 < data.length; ind2++) {
					const acc = data[ind2];
					found = arBudget.findIndex(bud => bud.account == acc.id);
					if (found >= 0) {
						data[ind2].budget = eval(arBudget[found].amount * 1);
					}
					data[ind2].diff = data[ind2].budget - data[ind2].amount;
				}
				res.json(data);
			})
			.catch((e) => console.error(e));
		})
		.catch((e) => console.error(e));					
	},

};