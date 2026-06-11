import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { CheckCircle2, FileText, Download, Layers } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getAverageReproScore, getReproGrade, getReproSuggestions } from '../utils/reproducibility';
import { getDatasetRiskGrade, getDatasetRiskScore, getDatasetRiskSuggestions, getProjectDatasetRiskSummary } from '../utils/datasetRisk';
import { getArtifactReadiness, getProjectArtifactSummary } from '../utils/artifacts';

const protocolFields = ['objective', 'hypothesis', 'studyType', 'inclusionCriteria', 'exclusionCriteria', 'datasetPlan', 'modelPlan', 'validationPlan', 'endpoints', 'statisticalPlan', 'ethicsNotes'];

const getProtocolCompletion = protocol => {
  const filled = protocolFields.filter(field => String(protocol?.[field] || '').trim()).length;
  return Math.round((filled / protocolFields.length) * 100);
};

const buildGapAnalysis = (project, datasets, experiments) => {
  const protocolCompletion = getProtocolCompletion(project?.studyProtocol);
  const artifactSummary = getProjectArtifactSummary(experiments);
  const riskSummary = getProjectDatasetRiskSummary(datasets);
  const avgRepro = getAverageReproScore(experiments);
  const xaiRecords = experiments.filter(exp => exp.xaiMethod && exp.xaiMethod !== 'None');
  const completedRuns = experiments.filter(exp => exp.status === 'completed').length;
  const gaps = [];

  if (protocolCompletion < 60) gaps.push(['Study design', 'High', 'Protocol needs objective, eligibility criteria, endpoints, validation plan, and statistical plan.']);
  if (!project?.literatureBaselines?.length) gaps.push(['Literature positioning', 'High', 'Add published baselines with dataset, model, metrics, and reproducibility notes.']);
  else if (project.literatureBaselines.length < 3) gaps.push(['Literature positioning', 'Medium', 'Add more comparable papers to strengthen claims against prior work.']);
  if (!datasets.length) gaps.push(['Dataset evidence', 'High', 'Register datasets with source, sample count, format, and limitations.']);
  else if (riskSummary.average > 50) gaps.push(['Dataset evidence', 'Medium', 'Strengthen bias, imbalance, missing-data, demographic, and annotation documentation.']);
  if (!experiments.length) gaps.push(['Experimental evidence', 'High', 'Log at least one baseline experiment before claiming performance.']);
  else if (!completedRuns) gaps.push(['Experimental evidence', 'Medium', 'Mark at least one run completed with final metrics and artifacts.']);
  if (avgRepro < 70) gaps.push(['Reproducibility', experiments.length ? 'High' : 'Medium', 'Record seeds, environment files, code links, hyperparameters, and model checkpoints.']);
  if (artifactSummary.average < 55) gaps.push(['Research artifacts', experiments.length ? 'Medium' : 'Low', 'Attach notebooks, model cards, environment files, weights, and protocol links.']);
  if (!xaiRecords.length) gaps.push(['Explainability', 'Medium', 'Add XAI evidence such as Grad-CAM, SHAP, LIME, or comparable interpretation records.']);

  const highCount = gaps.filter(([, priority]) => priority === 'High').length;
  const mediumCount = gaps.filter(([, priority]) => priority === 'Medium').length;
  const lowCount = gaps.filter(([, priority]) => priority === 'Low').length;
  const score = Math.max(0, Math.round(100 - (highCount * 18) - (mediumCount * 10) - (lowCount * 5)));

  return {
    gaps,
    score,
    label: score >= 80 ? 'Publication Ready' : score >= 60 ? 'Needs Minor Work' : score >= 40 ? 'Needs Major Work' : 'Not Ready Yet',
  };
};

const Reports = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    projectOverview: true,
    studyProtocol: true,
    literatureComparison: true,
    gapAnalysis: true,
    datasetSummary: true,
    experimentTable: true,
    bestModel: true,
    reproducibility: true,
    reproSuggestions: true,
    datasetRisk: true,
    artifacts: true,
    xaiEvidence: true,
  });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await api.get('/projects');
        setProjects(data);
        if (data.length > 0) setSelectedProjectId(data[0]._id);
      } catch (e) {
        toast.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const toggleOption = key => {
    setReportOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerateReport = async () => {
    if (!selectedProjectId) {
      toast.error('Select a project first');
      return;
    }
    
    setGenerating(true);
    try {
      const project = projects.find(p => p._id === selectedProjectId);
      
      // Fetch datasets and experiments for this project
      const [dsRes, expRes] = await Promise.all([
        api.get('/datasets'),
        api.get('/experiments')
      ]);
      
      const projectDatasets = dsRes.data.filter(d => (d.project?._id || d.project) === selectedProjectId);
      const projectExperiments = expRes.data.filter(e => (e.project?._id || e.project) === selectedProjectId);

      const doc = new jsPDF();
      let yPos = 20;
      const ensureSpace = (needed = 24) => {
        if (yPos + needed > 280) {
          doc.addPage();
          yPos = 20;
        }
      };

      // Title
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('MedReproLab Research Report', 14, yPos);
      yPos += 15;

      // Project Overview
      if (reportOptions.projectOverview) {
        doc.setFontSize(16);
        doc.setTextColor(79, 70, 229); // accent-blue
        doc.text(`Project: ${project.title}`, 14, yPos);
        yPos += 8;
        
        doc.setFontSize(12);
        doc.setTextColor(51, 65, 85); // slate-700
        doc.text(`Area: ${project.cancerType}`, 14, yPos);
        yPos += 6;
        doc.text(`Description: ${project.description}`, 14, yPos, { maxWidth: 180 });
        yPos += 16;
      }

      if (reportOptions.studyProtocol && project.studyProtocol) {
        ensureSpace(48);
        const protocol = project.studyProtocol;
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Study Protocol', 14, yPos);
        yPos += 8;

        const protocolRows = [
          ['Version', protocol.version || 'v1.0'],
          ['Status', protocol.protocolStatus || 'draft'],
          ['Study type', protocol.studyType || 'Not specified'],
          ['Objective', protocol.objective || 'Not specified'],
          ['Hypothesis', protocol.hypothesis || 'Not specified'],
          ['Inclusion criteria', protocol.inclusionCriteria || 'Not specified'],
          ['Exclusion criteria', protocol.exclusionCriteria || 'Not specified'],
          ['Dataset plan', protocol.datasetPlan || 'Not specified'],
          ['Model plan', protocol.modelPlan || 'Not specified'],
          ['Validation plan', protocol.validationPlan || 'Not specified'],
          ['Endpoints', protocol.endpoints || 'Not specified'],
          ['Statistical plan', protocol.statisticalPlan || 'Not specified'],
          ['Ethics notes', protocol.ethicsNotes || 'Not specified'],
        ];

        doc.autoTable({
          startY: yPos,
          head: [['Protocol Item', 'Details']],
          body: protocolRows,
          theme: 'grid',
          headStyles: { fillColor: [14, 165, 233] },
          columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 138 } },
          styles: { fontSize: 8, cellPadding: 2 }
        });
        yPos = doc.lastAutoTable.finalY + 16;
      }

      if (reportOptions.literatureComparison && project.literatureBaselines?.length) {
        ensureSpace(44);
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Literature & Baseline Comparison', 14, yPos);
        yPos += 8;

        const literatureRows = project.literatureBaselines.map(item => [
          item.paperTitle || 'Untitled paper',
          item.year || 'N/A',
          item.dataset || 'N/A',
          item.modelName || 'N/A',
          typeof item.accuracy === 'number' ? `${item.accuracy}%` : 'N/A',
          typeof item.f1Score === 'number' ? `${item.f1Score}%` : 'N/A',
          typeof item.auc === 'number' ? item.auc : 'N/A',
          item.reproducibilityNotes || 'N/A',
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Paper', 'Year', 'Dataset', 'Model', 'Accuracy', 'F1', 'AUC', 'Repro Notes']],
          body: literatureRows,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          styles: { fontSize: 7, cellPadding: 2 }
        });
        yPos = doc.lastAutoTable.finalY + 16;
      }

      if (reportOptions.gapAnalysis) {
        ensureSpace(42);
        const gapAnalysis = buildGapAnalysis(project, projectDatasets, projectExperiments);
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Research Gap Analysis', 14, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.text(`Gap score: ${gapAnalysis.score}% (${gapAnalysis.label})`, 14, yPos);
        yPos += 8;

        if (gapAnalysis.gaps.length) {
          doc.autoTable({
            startY: yPos,
            head: [['Area', 'Priority', 'Recommended Action']],
            body: gapAnalysis.gaps,
            theme: 'grid',
            headStyles: { fillColor: [248, 113, 113] },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 26 }, 2: { cellWidth: 112 } }
          });
          yPos = doc.lastAutoTable.finalY + 16;
        } else {
          doc.text('No major gaps detected. Maintain updated artifacts, review notes, and evidence links.', 14, yPos, { maxWidth: 180 });
          yPos += 14;
        }
      }

      // Dataset Summary
      if (reportOptions.datasetSummary) {
        ensureSpace(36);
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Dataset Summary', 14, yPos);
        yPos += 8;

        if (projectDatasets.length > 0) {
          const dsBody = projectDatasets.map(ds => [
            ds.name,
            ds.totalSamples || 'N/A',
            ds.source || 'N/A',
            ds.format || 'N/A'
          ]);
          
          doc.autoTable({
            startY: yPos,
            head: [['Dataset Name', 'Total Samples', 'Source', 'Format']],
            body: dsBody,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 10 }
          });
          yPos = doc.lastAutoTable.finalY + 16;
        } else {
          doc.setFontSize(10);
          doc.text('No datasets registered for this project.', 14, yPos);
          yPos += 12;
        }
      }

      // Experiment Table
      if (reportOptions.experimentTable) {
        ensureSpace(36);
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Experiments & Performance', 14, yPos);
        yPos += 8;

        if (projectExperiments.length > 0) {
          const expBody = projectExperiments.map(exp => [
            exp.name,
            exp.modelName,
            `${exp.metrics?.accuracy || 0}%`,
            `${exp.metrics?.f1Score || 0}%`,
            `${exp.reproducibilityScore || 0}%`,
            exp.xaiMethod || 'None'
          ]);

          doc.autoTable({
            startY: yPos,
            head: [['Experiment', 'Model', 'Accuracy', 'F1-Score', 'Repro Score', 'XAI Method']],
            body: expBody,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 10 }
          });
          
          yPos = doc.lastAutoTable.finalY + 16;
        } else {
          doc.setFontSize(10);
          doc.text('No experiments logged for this project.', 14, yPos);
          yPos += 12;
        }
      }

      if (projectExperiments.length > 0 && reportOptions.bestModel) {
        ensureSpace(18);
        const bestExp = [...projectExperiments].sort((a, b) => (b.metrics?.accuracy || 0) - (a.metrics?.accuracy || 0))[0];
        doc.setFontSize(11);
        doc.setTextColor(22, 163, 74); // accent-green
        doc.text(`Best Performing Model: ${bestExp.name} (${bestExp.modelName}) with ${bestExp.metrics?.accuracy}% Accuracy.`, 14, yPos);
        yPos += 14;
      }

      if (projectExperiments.length > 0 && reportOptions.reproducibility) {
        ensureSpace(30);
        const avgRepro = getAverageReproScore(projectExperiments);
        const avgGrade = getReproGrade(avgRepro);
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Reproducibility Summary', 14, yPos);
        yPos += 8;
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        doc.text(`Average reproducibility score: ${avgRepro}%`, 14, yPos);
        yPos += 8;
        doc.text(`Reproducibility grade: ${avgGrade.label}`, 14, yPos);
        yPos += 8;
        doc.text(`Experiments above 80%: ${projectExperiments.filter(exp => (exp.reproducibilityScore || 0) >= 80).length}`, 14, yPos);
        yPos += 14;
      }

      if (projectExperiments.length > 0 && reportOptions.reproSuggestions) {
        ensureSpace(42);
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Reproducibility Improvement Plan', 14, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        const weakest = [...projectExperiments].sort((a, b) => (a.reproducibilityScore || 0) - (b.reproducibilityScore || 0))[0];
        const suggestions = getReproSuggestions(weakest, 3);
        doc.text(`Priority experiment: ${weakest.name} (${weakest.reproducibilityScore || 0}%)`, 14, yPos, { maxWidth: 180 });
        yPos += 7;
        suggestions.forEach((suggestion, index) => {
          ensureSpace(8);
          doc.text(`${index + 1}. ${suggestion}`, 18, yPos, { maxWidth: 170 });
          yPos += 7;
        });
        yPos += 8;
      }

      if (projectExperiments.length > 0 && reportOptions.artifacts) {
        ensureSpace(42);
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Research Artifact Inventory', 14, yPos);
        yPos += 8;
        const artifactRows = projectExperiments.map(exp => {
          const readiness = getArtifactReadiness(exp);
          return [
            exp.name,
            `${readiness.label} (${readiness.percent}%)`,
            exp.githubLink ? 'Yes' : 'No',
            exp.notebookLink ? 'Yes' : 'No',
            exp.modelCardLink ? 'Yes' : 'No',
            exp.environmentFileLink || exp.requirementsLink ? 'Yes' : 'No',
            exp.weightsLink ? 'Yes' : 'No',
            exp.protocolLink ? 'Yes' : 'No'
          ];
        });
        doc.autoTable({
          startY: yPos,
          head: [['Experiment', 'Readiness', 'Code', 'Notebook', 'Model Card', 'Environment', 'Weights', 'Protocol']],
          body: artifactRows,
          theme: 'grid',
          headStyles: { fillColor: [14, 165, 233] },
          styles: { fontSize: 8 }
        });
        yPos = doc.lastAutoTable.finalY + 16;
      }

      if (projectDatasets.length > 0 && reportOptions.datasetRisk) {
        ensureSpace(42);
        const riskSummary = getProjectDatasetRiskSummary(projectDatasets);
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Dataset Bias & Risk Summary', 14, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.text(`Project dataset risk: ${riskSummary.grade.label} (${riskSummary.average}% risk)`, 14, yPos);
        yPos += 8;
        const riskRows = projectDatasets.map(dataset => {
          const riskScore = getDatasetRiskScore(dataset);
          const riskGrade = getDatasetRiskGrade(riskScore);
          return [
            dataset.name,
            riskGrade.label,
            `${riskScore}%`,
            getDatasetRiskSuggestions(dataset, 1)[0]
          ];
        });
        doc.autoTable({
          startY: yPos,
          head: [['Dataset', 'Risk Grade', 'Risk Score', 'Priority Action']],
          body: riskRows,
          theme: 'grid',
          headStyles: { fillColor: [248, 113, 113] },
          styles: { fontSize: 8 }
        });
        yPos = doc.lastAutoTable.finalY + 16;
      }

      if (projectExperiments.length > 0 && reportOptions.xaiEvidence) {
        ensureSpace(36);
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('XAI Evidence Status', 14, yPos);
        yPos += 8;
        const xaiRows = projectExperiments.map(exp => [
          exp.name,
          exp.xaiMethod || 'None',
          exp.xaiNotes ? exp.xaiNotes.slice(0, 70) : 'No notes'
        ]);
        doc.autoTable({
          startY: yPos,
          head: [['Experiment', 'Method', 'Notes']],
          body: xaiRows,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          styles: { fontSize: 9 }
        });
      }

      // Save
      doc.save(`MedReproLab_Report_${project.title.replace(/\s+/g, '_')}.pdf`);
      try {
        await api.post('/activities/report-generated', {
          projectId: selectedProjectId,
          title: `Report generated: ${project.title}`,
          description: 'Research report PDF generated from the report builder.',
          options: reportOptions,
        });
      } catch {
        console.warn('Report generated, but audit logging failed.');
      }
      toast.success('Report generated successfully!');

    } catch (e) {
      console.error(e);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Research Reports</h1>
          <p className="page-subtitle">Generate formal PDF summaries for funding applications or thesis attachments.</p>
        </div>
      </div>

      <div className="two-column-grid">
        <div className="academic-card" style={{ padding: 32, flex: 1, maxWidth: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} color="var(--accent-blue)" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Generate Report</h2>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="label">Select Project *</label>
            <select 
              className="input-field" 
              value={selectedProjectId} 
              onChange={e => setSelectedProjectId(e.target.value)}
              style={{ padding: 12, fontSize: 15 }}
            >
              {projects.length === 0 ? <option value="">No projects available</option> : null}
              {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
            </select>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 8, marginBottom: 24 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>Report builder:</h4>
            <div className="report-option-grid">
              {[
                ['projectOverview', 'Project overview'],
                ['studyProtocol', 'Study protocol'],
                ['literatureComparison', 'Literature baselines'],
                ['gapAnalysis', 'Research gap analysis'],
                ['datasetSummary', 'Dataset summary'],
                ['experimentTable', 'Experiment table'],
                ['bestModel', 'Best model highlight'],
                ['reproducibility', 'Reproducibility grade'],
                ['reproSuggestions', 'Improvement plan'],
                ['datasetRisk', 'Dataset risk'],
                ['artifacts', 'Research artifacts'],
                ['xaiEvidence', 'XAI evidence status'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleOption(key)}
                  className={`report-option ${reportOptions[key] ? 'active' : ''}`}
                >
                  <CheckCircle2 size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button 
            className="btn-primary" 
            onClick={handleGenerateReport} 
            disabled={generating || !selectedProjectId}
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
          >
            {generating ? 'Generating PDF...' : <><Download size={18} /> Download Research Report</>}
          </button>
        </div>

        {/* Right side illustration / info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'var(--gradient-primary)', borderRadius: 16, color: 'white', textAlign: 'center' }}>
          <Layers size={64} style={{ marginBottom: 24, opacity: 0.9 }} />
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Publication Ready</h3>
          <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.9 }}>
            Our reports are formatted cleanly and include all necessary metadata to demonstrate the rigour of your machine learning experiments. Perfect for MSc thesis appendices.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
