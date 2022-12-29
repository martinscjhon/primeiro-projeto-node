const express = require("express");
const moment = require("moment");
const { v4: generateUuid } = require("uuid");
const app = express();

app.use(express.json());

const customers = [];

// Middleware
function VerificyAccountExist(req, res, next) {
	const { cpf } = req.headers;
	const customer = customers.find((customer) => customer.cpf === cpf);

	if (!customer)
		return res
			.status(400)
			.json({ message: "Custumer não encontrado", isError: true });

	req.customer = customer;

	return next();
}

function getBalance(statement) {
	const balance = statement.reduce((acc, obj) => {
		if (obj.type === "credit") {
			return acc + obj.amount;
		} else {
			return acc - obj.amount;
		}
	}, 0);

	return balance;
}

app.post("/create/account", (req, res) => {
	const { cpf, name } = req.body;
	let result;
	let statusCode = 0;

	let customerExist = customers.some((customer) => customer.cpf === cpf);

	if (customerExist) {
		statusCode = 400;
		result = {
			message: "Já existe uma conta vinculada a este cpf.",
			isError: true,
		};
	}

	if (!customerExist) {
		statusCode = 200;
		result = {
			message: "Conta criada com sucesso!",
			isError: false,
		};
		customers.push({ cpf, name, id: generateUuid(), statement: [] });
	}

	return res.status(statusCode).json(result).send();
});

app.get("/statement", VerificyAccountExist, (req, res) => {
	const { customer } = req;

	return res.json(customer.statement);
});

app.post("/deposit", VerificyAccountExist, (req, res) => {
	const { amount, description } = req.body;

	const { customer } = req;

	const statementOperation = {
		uuid: generateUuid(),
		amount,
		description,
		create_at: moment().format("DD/MM/yyyy"),
		hours: moment().format("HH:mm"),
		type: "credit",
	};

	customer.statement.push(statementOperation);

	return res
		.status(200)
		.json({ message: "Deposito realizado com sucesso!", isError: false });
});

app.post("/saque", VerificyAccountExist, (req, res) => {
	const { amount } = req.body;
	const { customer } = req;
	const balance = getBalance(customer.statement);
	let result;
	let sobra = balance - amount;

	if (amount > balance) {
		statusCode = 400;
		result = {
			message: "Não é possível sacar o valor desejado.",
			isError: true,
		};
	} else {
		statusCode = 200;
		result = {
			message: "Saque realizado com sucesso!",
			isError: false,
		};

		const statementOperation = {
			uuid: generateUuid(),
			amount,
			create_at: moment().format("DD/MM/yyyy"),
			hours: moment().format("HH:mm"),
			type: "debit",
			valorAtual: sobra,
		};

		customer.statement.push(statementOperation);
	}

	return res.status(statusCode).json(result).send();
});

app.get("/statement/date", VerificyAccountExist, (req, res) => {
	const { customer } = req;
	const { date } = req.headers;

	const filterStatement = customer.statement.filter((valorAtual) => {
		let result;
		if (valorAtual.create_at === date) {
			result = valorAtual;
		}

		return result;
	});

	console.log(date);

	return res.json(filterStatement);
});

app.put("/update", VerificyAccountExist, (req, res) => {
	const { customer } = req;
	const { name } = req.body;

	console.log(customer), console.log(name);
	let result;
	let statusCode = 0;

	if (name === "") {
		result = {
			message: "Não é possível alterar o nome do usuário para vazio.",
			isError: true,
		};
		statusCode = 400;
	} else {
		result = {
			...customer,
			name,
		};
		statusCode = 200;
	}

	return res.json(result).status(statusCode).send();
});

app.delete("/delete/account", VerificyAccountExist, (req, res) => {
	const { customer } = req;
	customers.splice(customer, 1);

	return res
		.json({
			message: "Customer deletado com sucesso!",
			isError: false,
		})
		.status(200)
		.send();
});
app.listen(3333);
