package xdocs

type Metadata struct {
	Subject     string            `yaml:"subject" json:"subject"`
	Description string            `yaml:"description" json:"description"`
	Parent      *string           `yaml:"parent" json:"parent"`
	Children    []string          `yaml:"children" json:"children"`
	Files       map[string]string `yaml:"files" json:"files"`
	Documents   map[string]string `yaml:"documents" json:"documents"`
	Tags        []string          `yaml:"tags" json:"tags"`
	Keywords    []string          `yaml:"keywords" json:"keywords"`
	Flags       []string          `yaml:"flags" json:"flags"`
	Status      string            `yaml:"status,omitempty" json:"status,omitempty"`
}

type Frontmatter map[string]any

type MarkdownDocument struct {
	Path         string `json:"-"`
	RelativePath string `json:"relativePath"`
	Directory    string `json:"-"`
	Name         string `json:"name"`
}

type File struct {
	Path         string             `json:"-"`
	RelativePath string             `json:"path"`
	Directory    string             `json:"-"`
	Metadata     *Metadata          `json:"metadata,omitempty"`
	Documents    []MarkdownDocument `json:"discoveredDocuments"`
	Body         string             `json:"-"`
	Valid        bool               `json:"valid"`
	Errors       []string           `json:"errors"`
}

type ScanResult struct {
	TotalFiles             int                `json:"totalFiles"`
	TotalDirectories       int                `json:"totalDirectories"`
	TotalMarkdownDocuments int                `json:"totalMarkdownDocuments"`
	CoveredDirectories     int                `json:"coveredDirectories"`
	UncoveredDirectories   int                `json:"uncoveredDirectories"`
	XDocsFiles             []File             `json:"xdocsFiles"`
	MarkdownDocuments      []MarkdownDocument `json:"markdownDocuments"`
	UncoveredPaths         []string           `json:"uncoveredPaths"`
}

type TreeNode struct {
	Subject     string      `json:"subject"`
	Description string      `json:"description"`
	Path        *string     `json:"path"`
	Children    []*TreeNode `json:"children"`
}

type TreeValidation struct {
	Valid    bool     `json:"valid"`
	Warnings []string `json:"warnings"`
	Errors   []string `json:"errors"`
}

type Filters struct {
	Owner   string `json:"owner,omitempty"`
	Tag     string `json:"tag,omitempty"`
	Keyword string `json:"keyword,omitempty"`
}

type MetaDocument struct {
	Path         string      `json:"-"`
	RelativePath string      `json:"path"`
	Directory    string      `json:"-"`
	Name         string      `json:"name"`
	Owner        string      `json:"owner,omitempty"`
	Valid        bool        `json:"valid"`
	Frontmatter  Frontmatter `json:"frontmatter,omitempty"`
	Errors       []string    `json:"errors"`
}

type MetaDescriptor struct {
	Path         string         `json:"-"`
	RelativePath string         `json:"path"`
	Directory    string         `json:"-"`
	Subject      string         `json:"subject,omitempty"`
	Valid        bool           `json:"valid"`
	Frontmatter  Frontmatter    `json:"frontmatter,omitempty"`
	Metadata     *Metadata      `json:"metadata,omitempty"`
	Documents    []MetaDocument `json:"documents"`
	Errors       []string       `json:"errors"`
}

type MetaOptions struct {
	TargetPath       string
	IncludeDocuments bool
	Strict           bool
	Filters          Filters
}

type MetaResult struct {
	Root             string           `json:"root"`
	TargetPath       string           `json:"targetPath"`
	IncludeDocuments bool             `json:"includeDocuments"`
	Strict           bool             `json:"strict"`
	Filters          Filters          `json:"filters"`
	Descriptors      []MetaDescriptor `json:"descriptors"`
	Errors           []string         `json:"errors"`
}

type ContextOptions struct {
	TargetPath       string
	IncludeDocuments bool
	IncludeFiles     bool
	Limit            int
	Filters          Filters
}

type ContextEntry struct {
	Kind        string   `json:"kind"`
	Path        string   `json:"path"`
	Source      string   `json:"source"`
	Owner       string   `json:"owner,omitempty"`
	Score       int      `json:"score"`
	Reasons     []string `json:"reasons"`
	Description string   `json:"description,omitempty"`
}

type ContextResult struct {
	Root             string         `json:"root"`
	TargetPath       string         `json:"targetPath"`
	Query            string         `json:"query"`
	Tokens           []string       `json:"tokens"`
	IncludeDocuments bool           `json:"includeDocuments"`
	IncludeFiles     bool           `json:"includeFiles"`
	Filters          Filters        `json:"filters"`
	Entries          []ContextEntry `json:"entries"`
}

type DoctorOptions struct {
	TargetPath       string
	IncludeDocuments bool
	WarningsAsErrors bool
}

type DoctorIssue struct {
	Severity string  `json:"severity"`
	Code     string  `json:"code"`
	Path     *string `json:"path"`
	Message  string  `json:"message"`
}

type DoctorSummary struct {
	Errors   int `json:"errors"`
	Warnings int `json:"warnings"`
}

type DoctorResult struct {
	Root       string        `json:"root"`
	TargetPath string        `json:"targetPath"`
	Valid      bool          `json:"valid"`
	Summary    DoctorSummary `json:"summary"`
	Issues     []DoctorIssue `json:"issues"`
}
