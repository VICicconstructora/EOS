// Helper to evaluate traffic light status
export const evaluateStatus = (value, rules) => {
  if (rules.type === 'higher_is_better') {
    if (value >= rules.green) return 'success';
    if (value >= rules.yellow) return 'warning';
    return 'danger';
  } else { // lower_is_better
    if (value <= rules.green) return 'success';
    if (value <= rules.yellow) return 'warning';
    return 'danger';
  }
};

// Traverse tree to re-evaluate statuses when a rule changes
export const reEvaluateTree = (nodes) => {
  return nodes.map(node => {
    const newNode = { ...node };
    newNode.status = evaluateStatus(newNode.currentValue, newNode.rules);
    if (newNode.children && newNode.children.length > 0) {
      newNode.children = reEvaluateTree(newNode.children);
    }
    return newNode;
  });
};

// Flattens the tree into a simple list for dropdown selection
export const flattenKpiTree = (nodes, result = []) => {
  nodes.forEach(node => {
    result.push({
      id: node.id,
      title: node.title,
      currentValue: node.currentValue,
      targetValue: node.targetValue,
      format: node.format,
      rules: { ...node.rules }
    });
    if (node.children && node.children.length > 0) {
      flattenKpiTree(node.children, result);
    }
  });
  return result;
};

// Recursively find and update a node's rules, then re-evaluate the tree
export const updateKpiRulesInTree = (nodes, targetId, newRules) => {
  const updatedNodes = nodes.map(node => {
    const newNode = { ...node };
    if (newNode.id === targetId) {
      newNode.rules = { ...newRules };
    }
    if (newNode.children && newNode.children.length > 0) {
      newNode.children = updateKpiRulesInTree(newNode.children, targetId, newRules);
    }
    return newNode;
  });

  // After updating the specific rule, re-evaluate everything
  return reEvaluateTree(updatedNodes);
};

// Apply a map of stored rule overrides (from localStorage) to a fresh tree.
// `overrides` is { [kpiId]: { type, green, yellow } }.
export const applyStoredRulesToTree = (nodes, overrides) => {
  if (!overrides || Object.keys(overrides).length === 0) return reEvaluateTree(nodes);
  const apply = (n) => {
    const next = { ...n };
    if (overrides[next.id]) next.rules = { ...next.rules, ...overrides[next.id] };
    if (next.children && next.children.length > 0) next.children = next.children.map(apply);
    return next;
  };
  return reEvaluateTree(nodes.map(apply));
};
