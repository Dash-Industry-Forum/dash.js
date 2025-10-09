/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @classdesc Interval Tree for efficient lookup of cues within a time interval.
 * Lookups are O(log n + k), where n is the total number of cues and k is the number of cues in the interval.
 * @ignore
 */
class CueIntervalTree {

    /**
     * Creates a new IntervalTree instance.
     */
    constructor() {
        this.root = null;
        this.size = 0;
    }

    /**
     * Adds a cue to the interval tree.
     * Duplicates (according to {@link _compareCues}) are discarded.
     *
     * @param {TextTrackCue} cue - The cue to add
     */
    addCue(cue) {
        const newNode = {
            start: cue.startTime,
            end: cue.endTime,
            cue: cue,
            maxEnd: cue.endTime,
            left: null,
            right: null,
            height: 1
        };

        const [newRoot, inserted] = this._insert(newNode, this.root);
        this.root = newRoot;
        if (inserted) {
            this.size++;
        }
    }

    /**
     * Removes a cue from the interval tree.
     *
     * @param {TextTrackCue} cue - The cue to remove
     * @returns {boolean} True if the cue was found and removed, false otherwise
     */
    removeCue(cue) {
        const [newRoot, removed] = this._remove(cue, this.root);
        this.root = newRoot;
        if (removed) {
            this.size--;
        }
        return removed;
    }

    /**
     * Finds all cues that overlap with the given time range.
     *
     * @param {number} start - Start time of the range
     * @param {number} end - End time of the range
     * @returns {TextTrackCue[]} Array of overlapping cues
     */
    findCuesInRange(start, end) {
        const results = [];
        this._searchRange(this.root, start, end, results);
        return results;
    }

    /**
     * Finds all cues that are active at the given time point.
     *
     * @param {number} time - The time point
     * @returns {TextTrackCue[]} Array of active cues
     */
    findCuesAtTime(time) {
        return this.findCuesInRange(time, time);
    }

    // Methods for testing and debugging

    /**
     * Gets all cues in the tree.
     *
     * @returns {TextTrackCue[]} Array of all cues
     */
    getAllCues() {
        const cues = [];
        this._inorderTraversal(this.root, cues);
        return cues;
    }

    /**
     * Gets the number of cues in the tree.
     *
     * @returns {number} Number of cues
     */
    getSize() {
        return this.size;
    }

    /**
     * Clears all cues from the tree.
     * @returns {void}
     */
    clear() {
        this.root = null;
        this.size = 0;
    }

    // Private methods

    /**
     * Compares two cues for ordering and equality.
     * Returns negative if a < b, positive if a > b, 0 if equal.
     *
     * @param {TextTrackCue} cue1 - First cue
     * @param {TextTrackCue} cue2 - Second cue
     * @returns {number} Comparison result
     * @private
     */
    _compareCues(cue1, cue2) {
        // First compare by start time
        if (cue1.startTime !== cue2.startTime) {
            return cue1.startTime - cue2.startTime;
        }

        // Then compare by end time
        if (cue1.endTime !== cue2.endTime) {
            return cue1.endTime - cue2.endTime;
        }

        // Finally compare by text content
        if (typeof VTTCue !== 'undefined' && cue1 instanceof VTTCue && cue2 instanceof VTTCue) {
            return cue1.text.localeCompare(cue2.text);
        }

        // For non-VTTCue objects, compare by text property if available
        if (cue1.text && cue2.text) {
            return cue1.text.localeCompare(cue2.text);
        }

        // If no text property, consider them equal if timing matches
        return 0;
    }

    /**
     * Compares two intervals for tree ordering.
     *
     * @param {IntervalTreeNode} interval1 - First interval
     * @param {IntervalTreeNode} interval2 - Second interval
     * @returns {number} Comparison result
     * @private
     */
    _compareIntervals(interval1, interval2) {
        return this._compareCues(interval1.cue, interval2.cue);
    }

    /**
     * Inserts a node into the tree and returns the new root and a flag indicating whether it was inserted.
     * Duplicated cues are not inserted.
     *
     * @param {IntervalTreeNode} newNode - Node to insert
     * @param {IntervalTreeNode|null} subTree - Current subtree root
     * @returns {[IntervalTreeNode, boolean]} Tuple containing [newRoot, inserted]
     * @private
     */
    _insert(newNode, subTree) {
        if (!subTree) {
            return [newNode, true];
        }

        const comparison = this._compareIntervals(newNode, subTree);
        if (comparison < 0) {
            const [newLeft] = this._insert(newNode, subTree.left);
            subTree.left = newLeft;
        } else if (comparison > 0) {
            const [newRight] = this._insert(newNode, subTree.right);
            subTree.right = newRight;
        } else {
            // duplicate cue -> do not insert
            return [subTree, false];
        }

        // Update height and maxEnd
        subTree.height = 1 + Math.max(
            this._getHeight(subTree.left),
            this._getHeight(subTree.right)
        );
        subTree.maxEnd = Math.max(subTree.maxEnd, newNode.maxEnd);

        // Check balance and rotate if needed
        const balance = this._getBalance(subTree);

        // Left heavy
        if (balance > 1) {
            if (this._compareIntervals(newNode, subTree.left) < 0) {
                return [this._rightRotate(subTree), true];
            } else {
                subTree.left = this._leftRotate(subTree.left);
                return [this._rightRotate(subTree), true];
            }
        }

        // Right heavy
        if (balance < -1) {
            if (this._compareIntervals(newNode, subTree.right) > 0) {
                return [this._leftRotate(subTree), true];
            } else {
                subTree.right = this._rightRotate(subTree.right);
                return [this._leftRotate(subTree), true];
            }
        }

        return [subTree, true];
    }

    /**
     * Searches for intervals that overlap with the given range.
     *
     * @param {IntervalTreeNode|null} node - Current node
     * @param {number} start - Start time of search range
     * @param {number} end - End time of search range
     * @param {TextTrackCue[]} results - Array to collect results
     * @returns {void} - the results are collected in the results parameter
     * @private
     */
    _searchRange(node, start, end, results) {
        if (!node) {
            return;
        }

        // Check if current interval overlaps
        if (this._overlaps(node, start, end)) {
            results.push(node.cue);
        }

        // Recursively search left subtree if it might contain overlapping intervals
        if (node.left && node.left.maxEnd >= start) {
            this._searchRange(node.left, start, end, results);
        }

        // Recursively search right subtree only if current start <= query end
        if (node.right && node.start <= end) {
            this._searchRange(node.right, start, end, results);
        }
    }

    /**
     * Performs inorder traversal to collect all cues.
     *
     * @param {IntervalTreeNode|null} node - Current node
     * @param {TextTrackCue[]} cues - Array to collect cues
     * @returns {void}
     * @private
     */
    _inorderTraversal(node, cues) {
        if (!node) {
            return;
        }

        this._inorderTraversal(node.left, cues);
        cues.push(node.cue);
        this._inorderTraversal(node.right, cues);
    }

    /**
     * Checks if a time range overlaps with a node's time range.
     *
     * Note: Cues cannot have zero duration. It is assumed that node.end > node.start.
     *
     * @param {IntervalTreeNode} node - The node to check
     * @param {number} queryStart - Start of query range
     * @param {number} queryEnd - End of query range (exclusive)
     * @returns {boolean} True if ranges overlap
     * @private
     */
    _overlaps(node, queryStart, queryEnd) {
        if (queryEnd === queryStart) {
            const point = queryStart;
            return node.start <= point && point < node.end;
        }
        return node.start < queryEnd && queryStart < node.end;
    }

    /**
     * Gets the height of a node.
     *
     * @param {IntervalTreeNode|null} node - Node to get height for
     * @returns {number} Height of the node
     * @private
     */
    _getHeight(node) {
        return node ? node.height : 0;
    }

    /**
     * Gets the balance factor of a node.
     *
     * @param {IntervalTreeNode|null} node - Node to get balance for
     * @returns {number} Balance factor
     * @private
     */
    _getBalance(node) {
        return node ? this._getHeight(node.left) - this._getHeight(node.right) : 0;
    }

    /**
     * Performs a left rotation.
     *
     * @param {IntervalTreeNode} node - Node to rotate (must have a right child)
     * @returns {IntervalTreeNode} New root after rotation
     * @private
     */
    _leftRotate(node) {
        const right = node.right;
        const rightLeft = right.left;

        right.left = node;
        node.right = rightLeft;

        // Update heights
        node.height = 1 + Math.max(
            this._getHeight(node.left),
            this._getHeight(node.right)
        );
        right.height = 1 + Math.max(
            this._getHeight(right.left),
            this._getHeight(right.right)
        );

        // Update maxEnd
        node.maxEnd = Math.max(
            node.end,
            node.left ? node.left.maxEnd : 0,
            node.right ? node.right.maxEnd : 0
        );
        right.maxEnd = Math.max(
            right.end,
            right.left ? right.left.maxEnd : 0,
            right.right ? right.right.maxEnd : 0
        );

        return right;
    }

    /**
     * Performs a right rotation.
     *
     * @param {IntervalTreeNode} node - Node to rotate (must have a left child)
     * @returns {IntervalTreeNode} New root after rotation
     * @private
     */
    _rightRotate(node) {
        const left = node.left;
        const leftRight = left.right;

        left.right = node;
        node.left = leftRight;

        // Update heights
        node.height = 1 + Math.max(
            this._getHeight(node.left),
            this._getHeight(node.right)
        );
        left.height = 1 + Math.max(
            this._getHeight(left.left),
            this._getHeight(left.right)
        );

        // Update maxEnd
        node.maxEnd = Math.max(
            node.end,
            node.left ? node.left.maxEnd : 0,
            node.right ? node.right.maxEnd : 0
        );
        left.maxEnd = Math.max(
            left.end,
            left.left ? left.left.maxEnd : 0,
            left.right ? left.right.maxEnd : 0
        );

        return left;
    }

    /**
     * Removes a node from the tree and returns the new root and a flag indicating whether it was removed.
     *
     * @param {TextTrackCue} cue - The cue to remove
     * @param {IntervalTreeNode|null} node - Current subtree root
     * @returns {[IntervalTreeNode|null, boolean]} Tuple containing [newRoot, removed]
     * @private
     */
    _remove(cue, node) {
        if (!node) {
            return [null, false];
        }

        const comparison = this._compareCues(cue, node.cue);

        if (comparison < 0) {
            // Cue is in left subtree
            const [newLeft, removed] = this._remove(cue, node.left);
            node.left = newLeft;
            if (removed) {
                this._updateNode(node);
            }
            return [node, removed];
        } else if (comparison > 0) {
            // Cue is in right subtree
            const [newRight, removed] = this._remove(cue, node.right);
            node.right = newRight;
            if (removed) {
                this._updateNode(node);
            }
            return [node, removed];
        } else {
            // Found the cue to remove
            if (!node.left && !node.right) {
                // Leaf node
                return [null, true];
            } else if (!node.left) {
                // Only right child
                return [node.right, true];
            } else if (!node.right) {
                // Only left child
                return [node.left, true];
            } else {
                // Two children - find successor (leftmost in right subtree)
                const successor = this._findMin(node.right);
                node.cue = successor.cue;
                node.start = successor.start;
                node.end = successor.end;

                // Remove the successor
                const [newRight] = this._remove(successor.cue, node.right);
                node.right = newRight;

                this._updateNode(node);
                return [node, true];
            }
        }
    }

    /**
     * Finds the leftmost (minimum) node in a subtree.
     *
     * @param {IntervalTreeNode} node - Root of the subtree
     * @returns {IntervalTreeNode} The leftmost node
     * @private
     */
    _findMin(node) {
        while (node.left) {
            node = node.left;
        }
        return node;
    }

    /**
     * Updates a node's height and maxEnd after structural changes.
     *
     * @param {IntervalTreeNode} node - Node to update
     * @private
     */
    _updateNode(node) {
        node.height = 1 + Math.max(
            this._getHeight(node.left),
            this._getHeight(node.right)
        );
        node.maxEnd = Math.max(
            node.end,
            node.left ? node.left.maxEnd : 0,
            node.right ? node.right.maxEnd : 0
        );
    }
}

/**
 * @typedef {Object} IntervalTreeNode
 * @property {number} start - Start time of the interval
 * @property {number} end - End time of the interval
 * @property {TextTrackCue} cue - The cue object
 * @property {number} maxEnd - Maximum end time in this subtree
 * @property {IntervalTreeNode|null} left - Left child node
 * @property {IntervalTreeNode|null} right - Right child node
 * @property {number} height - Height of this node in the tree
 */

export { CueIntervalTree };
