const Model = Object.freeze({
	ideal: 0,
	random: 1,
});
var model = Model.ideal;

var sampleSize = 100;

var targetLengthMean = 14.34;
var targetLengthSD = 1.86;
var targetGirthMean = 11.5;
var targetGirthSD = 1.74; 
var targetCorrelation = 0.55;

var lengthMean = 0.0;
var lengthSD = NaN;
var girthMean = NaN;
var girthSD = NaN;
var lengthGirthR = NaN;

var useArchaicUnits = false;
const Sorting = Object.freeze({
	random: 0,
	volume: 1,
	length: 2,
	girth:  3,
});
var sorting = Sorting.random;

var sizes = [];
var userIndex = -1;

var scale = 5;

var displayCrossSections = false;
var highlightUserSize = true;
var displayNumbers = false;

const chartLineHeightFront = 25;
const chartLineHeightCrossSection = 8;
const minSpacing = 4.0;

var workerGenerator = new Worker("sample.js");

window.onload = function (_) {
	document.getElementById("my-length-input").value = toUserUnits(targetLengthMean).toFixed(1);
	document.getElementById("my-length-input").addEventListener("change", (event) => {
		sizes[userIndex].length = fromUserUnits(1.0*event.target.value);
		if (sorting != Sorting.random) {
			sortSample();
		}
		redrawChart();
	});

	document.getElementById("my-girth-input").value = toUserUnits(targetGirthMean).toFixed(1);
	document.getElementById("my-girth-input").addEventListener("change", (event) => {
		sizes[userIndex].girth = fromUserUnits(1.0*event.target.value);
		if (sorting != Sorting.random) {
			sortSample();
		}
		redrawChart();
	});

	document.getElementById("units-selector").addEventListener("change", (event) => {
		switch (event.target.value) {
			case "normal":
				useArchaicUnits = false;
				break;
			case "archaic":
				useArchaicUnits = true;
				break;
			default: console.assert(0);
		}
		document.getElementById("my-length-input").value = toUserUnits(sizes[userIndex].length).toFixed(1);
		document.getElementById("my-girth-input").value = toUserUnits(sizes[userIndex].girth).toFixed(1);

		document.getElementById("length-mean-input").value = toUserUnits(targetLengthMean).toFixed(2);
		document.getElementById("length-sd-input").value = toUserUnits(targetLengthSD).toFixed(2);
		document.getElementById("girth-mean-input").value = toUserUnits(targetGirthMean).toFixed(2);
		document.getElementById("girth-sd-input").value = toUserUnits(targetGirthSD).toFixed(2);

		document.querySelectorAll(".factual-length-avg").forEach(el => {
		el.textContent = toUserUnits(lengthMean).toFixed(2);
		});
		document.querySelectorAll(".factual-length-sd").forEach(el => {
			el.textContent = toUserUnits(lengthSD).toFixed(2);
		});
		document.querySelectorAll(".factual-girth-avg").forEach(el => {
			el.textContent = toUserUnits(girthMean).toFixed(2);
		});
		document.querySelectorAll(".factual-girth-sd").forEach(el => {
			el.textContent = toUserUnits(girthSD).toFixed(2);
		});
		document.querySelectorAll(".factual-r").forEach(el => {
			el.textContent = lengthGirthR.toFixed(2);
		});

		redrawChart();
	});
	
	document.getElementById("sorting-selector").addEventListener("change", (event) => {
		switch (event.target.value) {
			case "random":
				sorting = Sorting.random;
				break;
			case "volume":
				sorting = Sorting.volume;
				break;
			case "length":
				sorting = Sorting.length;
				break;
			case "girth":
				sorting = Sorting.girth;
				break;
			default: console.assert(0);
		}
		sortSample();
		redrawChart();
	});

	document.getElementById("sample-size-input").value = sampleSize;
	document.getElementById("sample-size-input").addEventListener("change", (event) => {
		sampleSize = event.target.value;
		document.querySelectorAll(".sample-size-output").forEach(el => {
			el.textContent = sampleSize;
		});
		document.title = `The Room of ${sampleSize} Men`;
		requestUpdate();
	});

	document.getElementById("scale-button-minus").addEventListener("click", (event) => {
		scale -= 0.1;
		redrawChart();
	});
	document.getElementById("scale-button-plus").addEventListener("click", (event) => {
		scale += 0.1;
		redrawChart();
	});

	document.getElementById("length-mean-input").value = toUserUnits(targetLengthMean);
	document.getElementById("length-mean-input").addEventListener("change", (event) => {
		targetLengthMean = fromUserUnits(1.0*event.target.value);
		requestUpdate();
	});

	document.getElementById("length-sd-input").value = toUserUnits(targetLengthSD);
	document.getElementById("length-sd-input").addEventListener("change", (event) => {
		targetLengthSD = fromUserUnits(1.0*event.target.value);
		requestUpdate();
	});

	document.getElementById("girth-mean-input").value = toUserUnits(targetGirthMean);
	document.getElementById("girth-mean-input").addEventListener("change", (event) => {
		targetGirthMean = fromUserUnits(1.0*event.target.value);
		requestUpdate();
	});

	document.getElementById("girth-sd-input").value = toUserUnits(targetGirthSD);
	document.getElementById("girth-sd-input").addEventListener("change", (event) => {
		targetGirthSD = fromUserUnits(1.0*event.target.value);
		requestUpdate();
	});

	document.getElementById("length-girth-correlation-input").value = targetCorrelation;
	document.getElementById("length-girth-correlation-input").addEventListener("change", (event) => {
		targetCorrelation = 1.0*event.target.value;
		requestUpdate();
	});

	document.getElementById("model-selector").addEventListener("change", (event) => {
		switch (event.target.value) {
			case "ideal":
				model = Model.ideal;
				break;
			case "random":
				model = Model.random;
				break;
			default: console.assert(0);
		}
		requestUpdate();
	});

	document.getElementById("display-cross-sections-input").addEventListener("change", (event) => {
		displayCrossSections = event.target.checked;
		redrawChart();
	});

	document.getElementById("highlight-user-size-input").addEventListener("change", (event) => {
		highlightUserSize = event.target.checked;
		redrawChart();
	});

	workerGenerator.addEventListener("message", (message) => {
		updateSample(message.data[0], message.data[1]);
		redrawChart();
	});	

	window.onresize = () => {
		redrawChart();
	};
	requestUpdate();
	
}

function sortSample() {
	switch (sorting) {
		case Sorting.random:
			randomShuffle(sizes);
			break;
		case Sorting.volume:
			sizes.sort((a, b) => {
				function volume(l, g) {
					let r = g/(2*Math.PI);
					return l*Math.PI*r*r;
				}
				return volume(a.length, a.girth) - volume(b.length, b.girth); 
			});
			break;
		case Sorting.length:
			sizes.sort((a, b) => { return a.length - b.length; });
			break;
		case Sorting.girth:
			sizes.sort((a, b) => { return a.girth - b.girth; });
			break;
		default: console.assert(0);
	}
	for (let i = 0; i < sizes.length; i++) {
		if (sizes[i].isMine) {
			userIndex = i;
			break;
		}
	}
}

function requestUpdate() {
	document.getElementById("chart__buzy-overlay").style.setProperty("visibility", "visible")
	switch (model) {
		case Model.ideal:
			workerGenerator.postMessage({
				command:"generate",
				model: "ideal",
				sampleSize: sampleSize-1, 
				targetCorrelation: targetCorrelation
			});
			break;
		case Model.random:
			workerGenerator.postMessage({
				command:"generate",
				model: "random",
				sampleSize: sampleSize-1, 
				targetCorrelation: targetCorrelation
			});
			break;
		default: console.assert(0);
	}
}


function updateSample(l, g) {

	const mean0 = mean(l);
	const mean1 = mean(g);

	const sd0 = standardDeviation(l, mean0);
	const sd1 = standardDeviation(g, mean1)

	lengthGirthR = correlation(l, mean0, sd0, g, mean1, sd1);

	lengthMean = targetLengthMean + mean0;
	lengthSD = targetLengthSD*sd0;
	
	girthMean = targetGirthMean + mean1;
	girthSD = targetGirthSD*sd1;


	document.querySelectorAll(".factual-length-avg").forEach(el => {
		el.textContent = toUserUnits(lengthMean).toFixed(2);
	});
	document.querySelectorAll(".factual-length-sd").forEach(el => {
		el.textContent = toUserUnits(lengthSD).toFixed(2);
	});
	document.querySelectorAll(".factual-girth-avg").forEach(el => {
		el.textContent = toUserUnits(girthMean).toFixed(2);
	});
	document.querySelectorAll(".factual-girth-sd").forEach(el => {
		el.textContent = toUserUnits(girthSD).toFixed(2);
	});
	document.querySelectorAll(".factual-r").forEach(el => {
		el.textContent = lengthGirthR.toFixed(2);
	});


	let userLength = targetLengthMean, userGirth = targetGirthMean;
	if (userIndex != -1) {
		userLength = sizes[userIndex].length;
		userGirth = sizes[userIndex].girth;
	}

	sizes = [];
	userIndex = -1;
	for (let i = 0; i < l.length; i++) {
		sizes.push({
			length : targetLengthMean + targetLengthSD*l[i],
			girth : targetGirthMean + targetGirthSD*g[i],
			isMine : false,
		});
	}
	sizes.push({
		length : userLength,
		girth : userGirth,
		isMine : true,
	});

	sortSample();

	document.getElementById("chart__buzy-overlay").style.setProperty("visibility", "hidden");

}

function toUserUnits(x) {
	return useArchaicUnits ? x / 2.54 : x;
}

function fromUserUnits(x) {
	return useArchaicUnits ? x * 2.54 : x;
}

function redrawChart() {
	let chart = document.getElementById("chart-values");

	const maxWidth = document.getElementById("chart")
		.getBoundingClientRect()
		.width;

	let widths = [];
	for (let i = 0; i < sizes.length; i++) {
		widths.push(scale*sizes[i].girth/Math.PI);
	}
	const lines = justify(widths, maxWidth, minSpacing);
	const lineWidth = lines[0].width + lines[0].spacing*(lines[0].length-1);

	while (true) {
		let child = chart.firstChild;
		if (!child) {
			break;
		}
		if (child.tagElement != "defs") {
			chart.removeChild(child);
		}
	}

	const lineHeight = chartLineHeightFront + (displayCrossSections ? chartLineHeightCrossSection : 0);
	
	let rowIndex = 0;
	let idx = 0;
	const xOffset = (maxWidth - lineWidth) / 2;
	for (let i = 0; i < lines.length; i++) {
		let x = xOffset;
		let y = rowIndex*lineHeight*scale;
		for (let j = 0; j < lines[i].length; j++) {
			let w = scale*sizes[idx].girth/Math.PI;
			let h = scale*sizes[idx].length;
			let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
			if (highlightUserSize && sizes[idx].isMine) {
				g.setAttribute("class", "chart__member highlighted");
			}
			else {
				g.setAttribute("class", "chart__member");
			}
			
			if (sizes[idx].isMine) {
				g.setAttribute("id", "chart__member-user");
				
			}
			{
				let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
				
				rect.setAttribute("x", x);
				rect.setAttribute("y", y + chartLineHeightFront*scale - h);
				rect.setAttribute("width", w);
				rect.setAttribute("height", h);
				/*
				let rect = document.createElementNS("http://www.w3.org/2000/svg", "path");
				rect.setAttribute("d", 	"M 20,0 C 7.6755366,0 0,18.418393 0,27.982859 0,33.307902 2.4474693,35.70979 "+
					"7.0254479,38.019212 1.3779308,45.220711 0.10412167,149.97918 0,150 H 40 "+
					"C 39.895879,149.97918 38.622069,45.220711 32.974552,38.019212 37.552531,35.70979 "+
					"40,33.307902 40,27.982859 40,18.418393 32.324464,0 20,0");
				rect.setAttribute("transform", `translate(${x}, ${y - h - 50}) scale(${w/40}, ${h/140})`);
				*/
				rect.setAttribute("class", "chart__member__front");
				if (sizes[idx].isMine) {
					rect.setAttribute("id", "my-size-front");
				}
				g.appendChild(rect);
			}
			/*
			{
				let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
				text.setAttribute("class", "chart__member__front-label");
				text.setAttribute("x", x + w*0.5);
				text.setAttribute("y", y - scale*11);
				text.setAttribute("text-anchor", "middle");
				text.textContent = idx;
				g.appendChild(text);
			}
			*/
			{
				let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
				text.setAttribute("class", "chart__member__front-label");
				text.setAttribute("x", x + w*0.5);
				text.setAttribute("y", y + chartLineHeightFront*scale - h - scale*0.8);
				text.setAttribute("text-anchor", "middle");
				text.textContent = toUserUnits(sizes[idx].length).toFixed(1);
				g.appendChild(text);
			}

			if (displayCrossSections) {
				let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
				circle.setAttribute("class", "chart__member__cross-section");
				circle.setAttribute("r", 0.5*w)
				circle.setAttribute("cx", x + 0.5*w);
				circle.setAttribute("cy", y + (chartLineHeightFront + chartLineHeightCrossSection*0.5)*scale);
				g.appendChild(circle);

				let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
				text.setAttribute("class", "chart__member__cross-section-label");
				text.setAttribute("x", x + w*0.5);
				text.setAttribute("y", y + (chartLineHeightFront + chartLineHeightCrossSection*0.5)*scale);
				text.setAttribute("text-anchor", "middle");
				text.setAttribute("alignment-baseline", "middle");
				text.textContent = toUserUnits(sizes[idx].girth).toFixed(1);
				g.appendChild(text);
			}

			x += w + lines[i].spacing;

			chart.appendChild(g);

			idx++;
		}
		rowIndex++;
	}

	document.getElementById("chart").setAttribute("height", (rowIndex*lineHeight*scale) + "px");
}

function justify(widths, maxWidth, minSpacing) {
	let lines = [ { length: 0, width: 0, spacing: minSpacing } ];
	
	function totalWidth(line) {
		if (line.length == 0) {
			return 0.0;
		}
		return line.width + line.spacing*(line.length - 1);
	}

	function totalWidthWith(line, w) {
		return line.width + w + line.spacing*line.length;
	}

	function totalWidthWithout(line, w) {
		const length = line.length - 1;
		if (line.length <= 0) {
			return 0.0;
		}
		return line.width - w + line.spacing*(length - 1);
	}

	for (let i = 0; i < widths.length; i++) {
		const w = widths[i];
		let lastLine = lines[lines.length-1];	
		if (totalWidthWith(lastLine, w) <= maxWidth) {
			lastLine.length += 1;
			lastLine.width += w;
		}
		else {
			lines.push( { offset: i, length: 1, width: w, spacing: minSpacing } );
		}
	}

	if (lines.length > 1) {
		let idx = lines.length-1;
		while (true) {

			let biggestWidth = -Infinity, smallestWidth = Infinity;
			for (let i = 0; i < lines.length; i++) {
				let lineWidth = totalWidth(lines[i]);
				if (lineWidth > biggestWidth) {
					biggestWidth = lineWidth;
				}
				if (lineWidth < smallestWidth) {
					smallestWidth = lineWidth;
				}

			}

			const prevOffset = lines[idx].offset - 1;
			const w = widths[prevOffset];
			if (totalWidthWithout(lines[idx-1], w) > smallestWidth 
					&& totalWidthWith(lines[idx], w) <= biggestWidth) {
				lines[idx].width += w;
				lines[idx].offset -= 1;
				lines[idx].length += 1;
				
				lines[idx-1].width -= w;
				lines[idx-1].length -= 1;

				idx -= 1;
			}
			else {
				if (idx == lines.length - 1) {
					break;
				}
				else {
					idx = lines.length-1;
				}
			}
			if (idx == 0) {
				idx = lines.length-1;
			}
		}
	}

	let blockWidth = 0.0;
	for (let i = 0; i < lines.length; i++) {
		const w = totalWidth(lines[i]);
		if (w > blockWidth) {
			blockWidth = w;
		}
	}

	for (let i = 0; i < lines.length; i++) {
		const spacing = (blockWidth - lines[i].width)/(lines[i].length - 1);
		lines[i].spacing = Math.max(spacing, minSpacing);
	}
	
	return lines;

}

function randomShuffle(a) {
	const N = a.length;
	for (let i1 = 0; i1 < N; i1++) {
		const i2 = (i1 + Math.floor((N - 1)*Math.random())) % N;
		[a[i1], a[i2]] = [a[i2], a[i1]];
	}
}


function correlation(data1, mean1, sd1, data2, mean2, sd2) {
	const N = Math.min(data1.length, data2.length);
	let productSum = 0;
	for (let i = 0; i < N; i++) {
		productSum += data1[i]*data2[i];
	}
	return (productSum - N*mean1*mean2) / (N*sd1*sd2);
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

function clamp(x, xMin, xMax) {
	return Math.min(Math.max(x, xMin), xMax);
}
