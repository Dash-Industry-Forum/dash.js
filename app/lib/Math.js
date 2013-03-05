/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * author Digital Primates
 * copyright dash-if 2012
 */ 
 if(typeof(utils) == "undefined"){
 	var utils = {};
 }
 
 if(typeof(utils.Math) == "undefined"){
 	utils.Math = {};
 }
 
 utils.Math.to64BitNumber = function(low, high) {
	var highNum, lowNum, expected;

	highNum = new goog.math.Long(0, high);
	lowNum = new goog.math.Long(low, 0);
	expected = highNum.add(lowNum);

	return expected.toNumber();
}