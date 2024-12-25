addEventListener("message", (message) => {
	if (message.data.command == "generate") {
		let r;
		switch (message.data.model) {
			case "ideal":
				r = standardSampleIdeal2(message.data.sampleSize, message.data.targetCorrelation);
				break;
			case "random":
				r = standardSampleRandom2(message.data.sampleSize, message.data.targetCorrelation);
				break;
			default: console.assert(0);
		}
		postMessage(r);
	}
});

function standardSampleIdeal(sampleSize) {
	const minP = 1.0/(sampleSize-1);
	const maxP = 1.0 - minP;
	let result = Array(sampleSize);
	for (let i = 0; i < sampleSize; i++) {
		const p = minP + (1.0*i/(sampleSize-1))*(maxP - minP);
		result[i] = normalDistributionInverse(p);
	}
	return result;
}

function standardSampleIdeal2(sampleSize, targetCorrelation) {

	let sample1 = standardSampleIdeal(sampleSize);
	let sample2 = Array.from(sample1);

	randomShuffle(sample2);

	const avg = mean(sample1);
	const sd = standardDeviation(sample1, avg);

	const eps = 0.005;

	let productSum = 0;
	for (let i = 0; i < sampleSize; i++) {
		productSum += sample1[i]*sample2[i];
	}
	let correlation = (productSum - sampleSize*avg*avg) / (sampleSize*sd*sd);
	let error = Math.abs(correlation - targetCorrelation);

	const iterLimit = sampleSize*sampleSize/2; 
	let iter = 0;
	while (error > eps) {
		const i1 = Math.floor((sampleSize-1)*Math.random());
		const i2 = i1 + 1;

		const newProductSum = productSum 
				- sample1[i1]*sample2[i1] - sample1[i2]*sample2[i2]
				+ sample1[i1]*sample2[i2] + sample1[i2]*sample2[i1];
		const newCorrelation = (newProductSum - sampleSize*avg*avg)/(sampleSize*sd*sd);
		const newError = Math.abs(newCorrelation - targetCorrelation);

		if (newError < error) {
			productSum = newProductSum;
			correlation = newCorrelation;
			error = newError;
			[sample2[i1], sample2[i2]] = [sample2[i2], sample2[i1]];
		}
		if (iter == iterLimit) {
			console.log("reached iteration limit");
			break;
		}
		iter++;
	}
	
	return [sample1, sample2];
}

function standardSampleRandom2(sampleSize, targetCorrelation) {

	let sample1 = Array(sampleSize);
	let sample2 = Array(sampleSize);

	for (let i = 0; i < sampleSize; i++) {
		const z1 = randomStandard();
		const z = randomStandard();
		const z2 = z1*targetCorrelation + z*Math.sqrt(1.0 - targetCorrelation*targetCorrelation);
		sample1[i] = z1;
		sample2[i] = z2;
	}
	return [sample1, sample2];
}

// Ported from the D programming language standard library
function normalDistributionInverse(p) {

	const EXP_2  = 0.135335283236612691893999494972484403; // exp(-2)
	const SQRT2PI = 2.50662827463100050241576528481104525; // sqrt(2pi)

	const P0 = [-0.0114001, 0.165922, -0.957046, 2.76536, -4.14498, 2.97149, -0.764954, 0.00877968];
	const Q0 = [-0.0108863, 0.182384, -1.25002, 4.49612, -9.03132, 9.90888, -5.30385, 1];
	const P1 = [0.000137715, 0.0140353, 0.369135, 3.64031, 17.7585, 53.0505, 93.3674, 94.5461, 43.6021, 4.30285];
	const Q1 = [0.00014987, 0.0152687, 0.399363, 3.84555, 17.7982, 50.3472, 80.3328, 70.7989, 20.0143, 1];
	const P2 = [7.37741e-07, 0.000161787, 0.00908283, 0.174028, 1.24089, 3.76548, 6.85626, 3.24453];
	const Q2 = [8.02829e-07, 0.000176045, 0.00986766, 0.187429, 1.28919, 3.52846, 6.02151, 1];
	const P3 = [-7.77283e-11, -6.43397e-08, -1.2754e-05, -0.000727932, -0.00650091, 0.211482, 2.13302, 2.02033];
	const Q3 = [-8.45849e-11, -7.00148e-08, -1.38765e-05, -0.000790854, -0.00691671, 0.234532, 2.27821, 1];

	if (p <= 0.0 || p >= 1.0) {
		if (p == 0.0) {
			return -Infinity;
		}
		if (p == 1.0) {
			return Infinity;
		}
		return NaN; // domain error
	}
	let code = 1;
	let y = p;
	if (y > (1.0 - EXP_2)) {
		y = 1.0 - y;
		code = 0;
	}

	let x, z, y2, x0, x1;

	if (y > EXP_2) {
		y = y - 0.5;
		y2 = y * y;
		x = y + y * (y2 * poly(y2, P0)/poly(y2, Q0));
		return x * SQRT2PI;
	}

	x = Math.sqrt(-2.0 * Math.log(y));
	x0 = x - Math.log(x)/x;
	z = 1.0/x;
	if (x < 8.0) {
		x1 = z * poly(z, P1)/poly(z, Q1);
	}
	else if (x < 32.0) {
		x1 = z * poly(z, P2)/poly(z, Q2);
	}
	else {
		x1 = z * poly(z, P3)/poly(z, Q3);
	}
	x = x0 - x1;
	if (code != 0) {
		x = -x;
	}
	return x;
}

function poly(x, A) {
	const N = A.length;
	let r = A[N - 1];
	for (let i = 1; i < N; i++) {
		r *= x;
		r += A[N - 1 - i];
	}
	return r;
}

function mean(data) {
	return data.reduce((a, b) => a + b, 0)/data.length;
}


function standardDeviation(data, mean) {
	const N = data.length;
	let productSum = 0;
	for (let i = 0; i < N; i++) {
		productSum += data[i]*data[i];
	}
	return Math.sqrt(productSum/N - mean*mean);
}

function randomStandard() {
	if (!isNaN(_cachedRandomStandard)) {
		const result = _cachedRandomStandard;
		_cachedRandomStandard = NaN;
		return result;
	}
	let x1, x2, rPow2;
	do {
		x1 = 2.0*Math.random() - 1.0;
		x2 = 2.0*Math.random() - 1.0;
		rPow2 = x1 * x1 + x2 * x2;
	} while (rPow2 > 1.0 || rPow2 == 0.0);
	const f = Math.sqrt(-2.0 * Math.log(rPow2)/rPow2);
	_cachedRandomStandard = f*x1;
	return f*x2;
}
var _cachedRandomStandard = NaN;


function clamp(x, xMin, xMax) {
	return Math.min(Math.max(x, xMin), xMax);
}

function randomShuffle(a) {
	const N = a.length;
	for (let i1 = 0; i1 < N; i1++) {
		const i2 = (i1 + Math.floor((N - 1)*Math.random())) % N;
		[a[i1], a[i2]] = [a[i2], a[i1]];
	}
}
