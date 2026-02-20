// PubMed 논문 검색 모듈 (브라우저 fetch + DOMParser)
window.AutoStat = window.AutoStat || {};

// 통계 방법별 검색어 매핑
window.AutoStat.STAT_SEARCH_TERMS = {
    "one_sample_t": "one sample t-test",
    "independent_t": "independent samples t-test OR two-sample t-test",
    "paired_t": "paired t-test OR paired samples t-test",
    "mann_whitney": "Mann-Whitney U test OR Wilcoxon rank-sum test",
    "wilcoxon_signed_rank": "Wilcoxon signed-rank test",
    "one_way_anova": "one-way ANOVA OR one-way analysis of variance",
    "kruskal_wallis": "Kruskal-Wallis test",
    "repeated_anova": "repeated measures ANOVA",
    "friedman": "Friedman test",
    "chi_square": "chi-square test OR chi-squared test",
    "fisher_exact": "Fisher exact test OR Fisher's exact test",
    "mcnemar": "McNemar test OR McNemar's test",
    "pearson_correlation": "Pearson correlation",
    "spearman_correlation": "Spearman correlation OR Spearman's rho",
    "simple_regression": "simple linear regression",
    "multiple_regression": "multiple linear regression OR multiple regression",
    "logistic_regression": "logistic regression",
    "ancova": "ANCOVA OR analysis of covariance",
    "two_way_anova": "two-way ANOVA",
    "mixed_anova": "mixed ANOVA OR mixed model ANOVA",
    "point_biserial": "point-biserial correlation",
    "ordinal_regression": "ordinal logistic regression OR proportional odds"
};

// 재활 분야 검색어
window.AutoStat.THERAPY_FIELDS = {
    "pt": {
        name: "물리치료 (Physical Therapy)",
        terms: ["physical therapy", "physiotherapy", "physical rehabilitation"]
    },
    "ot": {
        name: "작업치료 (Occupational Therapy)",
        terms: ["occupational therapy", "occupational rehabilitation"]
    },
    "st": {
        name: "언어치료 (Speech Therapy)",
        terms: ["speech therapy", "speech-language pathology", "speech rehabilitation"]
    },
    "psych": {
        name: "재활심리 (Rehabilitation Psychology)",
        terms: ["rehabilitation psychology", "psychological rehabilitation", "cognitive rehabilitation"]
    },
    "neuro": {
        name: "신경재활 (Neurorehabilitation)",
        terms: ["neurorehabilitation", "neurological rehabilitation", "stroke rehabilitation"]
    },
    "all": {
        name: "전체 재활 분야",
        terms: [
            "physical therapy", "physiotherapy", "occupational therapy",
            "speech therapy", "speech-language pathology",
            "rehabilitation psychology", "neurorehabilitation",
            "cardiac rehabilitation", "pulmonary rehabilitation",
            "stroke rehabilitation", "musculoskeletal rehabilitation"
        ]
    }
};

// SCI-E급 재활·의학 저널 화이트리스트 (약 60개)
window.AutoStat.SCI_REHAB_JOURNALS = [
    // 재활의학 핵심 저널
    "Archives of Physical Medicine and Rehabilitation",
    "Physical Therapy",
    "Journal of Rehabilitation Medicine",
    "Neurorehabilitation and Neural Repair",
    "Clinical Rehabilitation",
    "Disability and Rehabilitation",
    "Journal of Physiotherapy",
    "American Journal of Physical Medicine & Rehabilitation",
    "American Journal of Physical Medicine and Rehabilitation",
    "European Journal of Physical and Rehabilitation Medicine",
    "Journal of NeuroEngineering and Rehabilitation",
    "Topics in Stroke Rehabilitation",
    "Brain Injury",
    "Journal of Head Trauma Rehabilitation",
    "Spinal Cord",
    "Journal of Spinal Cord Medicine",
    "PM & R",
    "PM&R",
    "Physiotherapy Research International",
    "Physiotherapy",
    "Journal of Orthopaedic & Sports Physical Therapy",
    "Journal of Orthopaedic and Sports Physical Therapy",
    "Physical Therapy in Sport",
    "Manual Therapy",
    "Musculoskeletal Science and Practice",
    "International Journal of Rehabilitation Research",
    "Rehabilitation Psychology",
    "NeuroRehabilitation",
    "Assistive Technology",
    "Journal of Rehabilitation Research and Development",
    "Journal of Rehabilitation Research & Development",
    "Annals of Rehabilitation Medicine",
    // 작업치료
    "American Journal of Occupational Therapy",
    "British Journal of Occupational Therapy",
    "Canadian Journal of Occupational Therapy",
    "Scandinavian Journal of Occupational Therapy",
    "OTJR: Occupation, Participation and Health",
    // 언어치료
    "Journal of Speech, Language, and Hearing Research",
    "American Journal of Speech-Language Pathology",
    "International Journal of Language & Communication Disorders",
    "Aphasiology",
    "Dysphagia",
    // 신경재활·뇌졸중
    "Stroke",
    "Journal of Neurology, Neurosurgery, and Psychiatry",
    "Journal of Neurology, Neurosurgery & Psychiatry",
    "Journal of Neurology",
    "Multiple Sclerosis Journal",
    "Parkinsonism & Related Disorders",
    "Movement Disorders",
    "Journal of Neurologic Physical Therapy",
    // 주요 의학/과학 저널 (재활 논문 게재)
    "BMJ",
    "The Lancet",
    "JAMA",
    "New England Journal of Medicine",
    "PLoS ONE",
    "PLoS One",
    "BMC Musculoskeletal Disorders",
    "BMC Neurology",
    "Trials",
    "Cochrane Database of Systematic Reviews",
    "Systematic Reviews",
    "Medicine",
    "Scientific Reports",
    "Frontiers in Neurology",
    "Frontiers in Human Neuroscience",
    // 통증·근골격
    "Pain",
    "The Journal of Pain",
    "European Spine Journal",
    "Spine",
    "The Spine Journal",
    "Journal of Back and Musculoskeletal Rehabilitation",
    // 노인·심장·폐
    "Journal of Geriatric Physical Therapy",
    "Age and Ageing",
    "Journal of Cardiopulmonary Rehabilitation and Prevention",
    "Respiratory Medicine",
    // 스포츠의학
    "British Journal of Sports Medicine",
    "Sports Medicine",
    "Journal of Science and Medicine in Sport",
    "Knee Surgery, Sports Traumatology, Arthroscopy",
    // 건강과학 일반
    "Journal of Clinical Medicine",
    "Healthcare",
    "International Journal of Environmental Research and Public Health"
];

window.AutoStat.PubMedSearcher = {
    BASE_URL: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/",
    lastRequestTime: 0,
    MIN_INTERVAL: 340,

    search: async function(statMethod, therapyField, maxResults, sciFilter) {
        therapyField = therapyField || "all";
        maxResults = maxResults || 10;
        // sciFilter: true면 SCI-E 저널만 필터링
        if (typeof sciFilter === 'undefined') sciFilter = true;

        var statTerm = window.AutoStat.STAT_SEARCH_TERMS[statMethod] || statMethod;
        var fieldInfo = window.AutoStat.THERAPY_FIELDS[therapyField] ||
                        window.AutoStat.THERAPY_FIELDS["all"];
        var rehabTerms = fieldInfo.terms;

        // 검색 쿼리 구성
        var rehabQuery = rehabTerms.map(function(t) {
            return '"' + t + '"[Title/Abstract]';
        }).join(" OR ");
        var query = '(' + statTerm + ')[Title/Abstract] AND (' + rehabQuery + ')';
        query += ' AND ("2015"[Date - Publication] : "3000"[Date - Publication])';

        // SCI 필터 적용 시 3배 더 검색 (필터 후 줄어들므로)
        var fetchCount = sciFilter ? maxResults * 3 : maxResults;

        try {
            var pmids = await this._esearch(query, fetchCount);

            if (!pmids || pmids.length === 0) {
                return {
                    success: true,
                    query: query,
                    therapy_field: fieldInfo.name,
                    total_count: 0,
                    papers: [],
                    sci_filtered: sciFilter,
                    message: "검색 결과가 없습니다.",
                    search_url: this._buildSearchUrl(statTerm, rehabTerms[0])
                };
            }

            var papers = await this._efetch(pmids);

            // SCI-E 필터링
            if (sciFilter) {
                papers = this._filterSciJournals(papers);
            }

            // 최대 결과 수 제한
            papers = papers.slice(0, maxResults);

            return {
                success: true,
                query: query,
                therapy_field: fieldInfo.name,
                total_count: papers.length,
                papers: papers,
                sci_filtered: sciFilter
            };
        } catch (e) {
            return {
                success: false,
                error: e.message || String(e),
                query: query,
                therapy_field: fieldInfo.name,
                papers: [],
                sci_filtered: sciFilter,
                search_url: this._buildSearchUrl(statTerm, rehabTerms[0])
            };
        }
    },

    _filterSciJournals: function(papers) {
        var whitelist = window.AutoStat.SCI_REHAB_JOURNALS;
        return papers.filter(function(paper) {
            if (!paper.journal) return false;
            var journalLower = paper.journal.toLowerCase();
            return whitelist.some(function(sciJournal) {
                return journalLower.indexOf(sciJournal.toLowerCase()) !== -1 ||
                       sciJournal.toLowerCase().indexOf(journalLower) !== -1;
            });
        }).map(function(paper) {
            paper.is_sci = true;
            return paper;
        });
    },

    isSciJournal: function(journalName) {
        if (!journalName) return false;
        var journalLower = journalName.toLowerCase();
        return window.AutoStat.SCI_REHAB_JOURNALS.some(function(sciJournal) {
            return journalLower.indexOf(sciJournal.toLowerCase()) !== -1 ||
                   sciJournal.toLowerCase().indexOf(journalLower) !== -1;
        });
    },

    _rateLimitWait: function() {
        var elapsed = Date.now() - this.lastRequestTime;
        if (elapsed < this.MIN_INTERVAL) {
            return new Promise(function(resolve) {
                setTimeout(resolve, this.MIN_INTERVAL - elapsed);
            }.bind(this));
        }
        return Promise.resolve();
    },

    _esearch: async function(query, maxResults) {
        await this._rateLimitWait();
        this.lastRequestTime = Date.now();

        var params = new URLSearchParams({
            db: "pubmed",
            term: query,
            retmax: String(maxResults),
            retmode: "json",
            email: "researcher@example.com",
            sort: "relevance"
        });

        var response = await fetch(this.BASE_URL + "esearch.fcgi?" + params.toString());
        if (!response.ok) throw new Error("ESearch API 요청 실패: " + response.status);

        var data = await response.json();
        return (data.esearchresult && data.esearchresult.idlist) || [];
    },

    _efetch: async function(pmids) {
        if (!pmids || pmids.length === 0) return [];

        await this._rateLimitWait();
        this.lastRequestTime = Date.now();

        var params = new URLSearchParams({
            db: "pubmed",
            id: pmids.join(","),
            retmode: "xml",
            email: "researcher@example.com"
        });

        var response = await fetch(this.BASE_URL + "efetch.fcgi?" + params.toString());
        if (!response.ok) throw new Error("EFetch API 요청 실패: " + response.status);

        var xmlText = await response.text();
        return this._parseXml(xmlText);
    },

    _parseXml: function(xmlText) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(xmlText, "text/xml");
        var articles = doc.querySelectorAll("PubmedArticle");
        var papers = [];
        var self = this;
        articles.forEach(function(article) {
            var paper = self._parseArticle(article);
            if (paper) papers.push(paper);
        });
        return papers;
    },

    _parseArticle: function(article) {
        try {
            // PMID
            var pmidElem = article.querySelector("PMID");
            var pmid = pmidElem ? pmidElem.textContent : "";

            // 제목
            var titleElem = article.querySelector("ArticleTitle");
            var title = titleElem ? titleElem.textContent : "No title";

            // 초록
            var abstractParts = article.querySelectorAll("AbstractText");
            var abstractTexts = [];
            abstractParts.forEach(function(part) {
                if (part.textContent) abstractTexts.push(part.textContent);
            });
            var abstract = abstractTexts.join(" ");
            if (abstract.length > 500) abstract = abstract.substring(0, 500) + "...";

            // 저자
            var authors = [];
            var authorElems = article.querySelectorAll("Author");
            authorElems.forEach(function(author) {
                var lastname = author.querySelector("LastName");
                var forename = author.querySelector("ForeName");
                if (lastname) {
                    var name = lastname.textContent;
                    if (forename) name = forename.textContent + " " + name;
                    authors.push(name);
                }
            });

            // 저널
            var journalElem = article.querySelector("Journal > Title");
            var journal = journalElem ? journalElem.textContent : "";

            // 출판 연도
            var yearElem = article.querySelector("PubDate > Year");
            if (!yearElem) yearElem = article.querySelector("PubDate > MedlineDate");
            var year = "";
            if (yearElem && yearElem.textContent) {
                year = yearElem.textContent.substring(0, 4);
            }

            // DOI
            var doi = "";
            var articleIds = article.querySelectorAll("ArticleId");
            articleIds.forEach(function(aid) {
                if (aid.getAttribute("IdType") === "doi") {
                    doi = aid.textContent;
                }
            });

            // 키워드
            var keywords = [];
            article.querySelectorAll("Keyword").forEach(function(kw) {
                if (kw.textContent) keywords.push(kw.textContent);
            });
            article.querySelectorAll("MeshHeading > DescriptorName").forEach(function(mesh) {
                if (mesh.textContent) keywords.push(mesh.textContent);
            });

            var authorsDisplay = authors.slice(0, 3).join(", ");
            if (authors.length > 3) authorsDisplay += " et al.";

            return {
                pmid: pmid,
                title: title,
                abstract: abstract,
                authors: authors.slice(0, 5),
                authors_display: authorsDisplay,
                journal: journal,
                year: year,
                doi: doi,
                keywords: keywords.slice(0, 10),
                pubmed_url: "https://pubmed.ncbi.nlm.nih.gov/" + pmid + "/"
            };
        } catch (e) {
            console.error("논문 파싱 오류:", e);
            return null;
        }
    },

    _buildSearchUrl: function(statTerm, rehabTerm) {
        var query = statTerm + " AND " + rehabTerm;
        return "https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURIComponent(query);
    },

    getFallback: function(statMethod, therapyField) {
        therapyField = therapyField || "all";
        var statTerm = window.AutoStat.STAT_SEARCH_TERMS[statMethod] || statMethod;
        var fieldInfo = window.AutoStat.THERAPY_FIELDS[therapyField] ||
                        window.AutoStat.THERAPY_FIELDS["all"];

        return {
            success: true,
            query: statTerm + " AND " + fieldInfo.terms[0],
            therapy_field: fieldInfo.name,
            total_count: 0,
            papers: [],
            message: "PubMed에서 '" + statTerm + "' 관련 " + fieldInfo.name + " 논문을 검색하려면 아래 링크를 클릭하세요.",
            search_url: this._buildSearchUrl(statTerm, fieldInfo.terms[0])
        };
    },

    getTherapyFields: function() {
        var fields = [];
        for (var key in window.AutoStat.THERAPY_FIELDS) {
            fields.push({
                id: key,
                name: window.AutoStat.THERAPY_FIELDS[key].name
            });
        }
        return fields;
    }
};
