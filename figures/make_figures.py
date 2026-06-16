import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np, os, json
OUT=os.path.dirname(os.path.abspath(__file__))
PAR=os.path.join(OUT,"..","parity_b16.json")
NAVY="#1A2332";BLUE="#2E6CA4";TEAL="#2E8B8B";AMBER="#C97A1A";GREY="#5A6472";LIGHT="#E8EEF4";GREEN="#2E8B57"
plt.rcParams.update({"font.family":"DejaVu Sans","font.size":9})
def box(ax,x,y,w,h,txt,fc,tc="white",fs=8.5):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle="round,pad=0.012,rounding_size=0.02",fc=fc,ec="none"));ax.text(x+w/2,y+h/2,txt,ha="center",va="center",color=tc,fontsize=fs)
def arrow(ax,x1,y1,x2,y2):ax.add_patch(FancyArrowPatch((x1,y1),(x2,y2),arrowstyle="-|>",mutation_scale=13,lw=1.4,color=GREY))
# FIG 1 architecture
fig,ax=plt.subplots(figsize=(8.6,4.7));ax.set_xlim(0,10);ax.set_ylim(0,6.4);ax.axis("off")
ax.text(5,6.15,"rbGyanX Mobile — on-device data flow (no network required)",ha="center",fontsize=11,fontweight="bold",color=NAVY)
box(ax,0.15,4.4,2.25,1.35,"TPS export\n\nEclipse .txt DVH\nDICOM RT-Dose + RT-Struct\n(Eclipse / Monaco)",BLUE,fs=7.8)
box(ax,2.85,4.5,2.0,1.15,"Parser & de-identification\n• DVH text\n• RT-Dose tag 3004,0050\n• % → cm³ (contour)",TEAL,fs=7.4)
box(ax,5.3,4.6,1.9,0.95,"Composite DVH\n(vendor-neutral)\ntarget + OARs",GREY,fs=7.8)
box(ax,0.5,1.55,8.9,2.35,"",LIGHT,tc=NAVY)
ax.text(4.95,3.66,"On-device radiobiology engine  (shared performCalculation / evaluateCompositePlan)",ha="center",fontsize=8.7,fontweight="bold",color=NAVY)
box(ax,0.8,2.0,2.55,1.25,"Physical indices\nTCI, D95, Dxx, Vxx\nCI (BODY only), HI",BLUE,fs=7.6)
box(ax,3.55,2.0,2.8,1.25,"Biological models (all)\nBED, EQD2, gEUD\nTCP: Poisson-LQ, LKB, ZM\nNTCP: LKB ll/probit, Poisson",TEAL,fs=7.2)
box(ax,6.55,2.0,2.55,1.25,"Composite therapeutic\nwindow\nUTCP, P+, TWI\n(risk-weighted)",AMBER,fs=7.8)
box(ax,2.0,0.18,2.6,1.0,"Explainability (rb X)\n+ optional covariate\nlog-odds (base→adj.)",GREY,fs=7.4)
box(ax,5.0,0.18,2.9,1.0,"Report (PDF / DOCX)\nmulti-model + TW chart",NAVY,fs=7.8)
arrow(ax,2.4,5.05,2.85,5.05);arrow(ax,4.85,5.05,5.3,5.05);arrow(ax,6.25,4.85,6.25,3.9)
arrow(ax,4.95,1.55,3.6,1.18);arrow(ax,5.4,1.55,6.0,1.18)
fig.text(0.5,0.015,"All parsing, calculation and report generation execute locally; no patient data leave the device.",ha="center",fontsize=7.3,style="italic",color=GREY)
fig.savefig(OUT+"/fig1_architecture.png",dpi=200,bbox_inches="tight");plt.close(fig)
# build16 per-case
cases=["DCM-001","DCM-002","DCM-003","TXT-001","TXT-002","TXT-003","TXT-004","TXT-005","TXT-006","TXT-007","TXT-008","TXT-009","TXT-010","TXT-011","TXT-012","TXT-013","TXT-014"]
ntcp=[67.1,19.6,71.9,62.7,81.7,71.0,66.3,77.9,84.7,29.3,50.6,67.0,12.6,82.7,93.0,59.7,84.5]
twi =[44.6,77.4,67.6,35.0,70.5,73.7,41.7,28.1,22.8,86.2,79.8,29.6,91.2,39.9,26.0,77.1,15.6]
tci =[99.5,56.3,71.7,90.1,19.0,14.2,99.9,86.9,74.1,86.6,71.8,90.3,86.6,70.1,73.6,91.3,83.6]
fig,ax=plt.subplots(figsize=(10,4.2));x=np.arange(len(cases));w=0.27
ax.bar(x-w,ntcp,w,label="Composite NTCP",color=TEAL);ax.bar(x,twi,w,label="TWI",color=AMBER);ax.bar(x+w,tci,w,label="TCI",color=BLUE)
ax.axhline(15,ls="--",lw=1,color=GREY);ax.text(len(cases)-0.5,16.5,"TWI favourable ≥ 15",fontsize=7,color=GREY,ha="right")
ax.set_xticks(x);ax.set_xticklabels(cases,rotation=60,ha="right",fontsize=7.5);ax.set_ylabel("Value (%)");ax.set_ylim(0,105)
ax.legend(ncol=3,fontsize=8,loc="upper center",bbox_to_anchor=(0.5,1.1),frameon=False)
ax.set_title("Per-case composite indices (build 16; TCI at DVH-header prescription). TCP at 95% display ceiling in 16/17.",fontsize=9,color=NAVY,pad=22)
ax.grid(axis="y",alpha=0.25);fig.tight_layout();fig.savefig(OUT+"/fig3_percase.png",dpi=200,bbox_inches="tight");plt.close(fig)
# FIG 2 verification
par=json.load(open(PAR))
fig,axs=plt.subplots(1,3,figsize=(10,3.5))
def ag(ax,calc,app,label,unit,col):
    calc=np.array(calc);app=np.array(app);lo=min(calc.min(),app.min());hi=max(calc.max(),app.max());pad=(hi-lo)*0.08
    ax.plot([lo-pad,hi+pad],[lo-pad,hi+pad],"--",color="#999",lw=1);ax.scatter(app,calc,s=34,color=col,edgecolor="white",linewidth=0.6,zorder=3)
    d=np.abs(calc-app);ax.set_xlabel(f"App engine {label} ({unit})");ax.set_ylabel(f"Independent {label} ({unit})")
    ax.set_title(f"{label}\nmean|Δ|={d.mean():.2f}, max|Δ|={d.max():.2f} {unit}",fontsize=9);ax.set_xlim(lo-pad,hi+pad);ax.set_ylim(lo-pad,hi+pad);ax.grid(alpha=0.25)
ag(axs[0],[r['d95_calc'] for r in par],[r['d95_app'] for r in par],"D95","Gy",BLUE)
ag(axs[1],[r['ntcp_calc'] for r in par],[r['ntcp_app'] for r in par],"Composite NTCP","%",TEAL)
ag(axs[2],[r['twi_calc'] for r in par],[r['twi_app'] for r in par],"TWI","%",AMBER)
fig.suptitle("Independent re-implementation vs application engine, build 16 (n = 17)",fontsize=10.5,fontweight="bold",color=NAVY,y=1.02)
fig.tight_layout();fig.savefig(OUT+"/fig2_verification.png",dpi=200,bbox_inches="tight");plt.close(fig)
# FIG 4 sensitivity
ex=["TXT-007","TXT-001","TXT-012"];idx=[cases.index(e) for e in ex]
fig,axs=plt.subplots(1,2,figsize=(9,3.6))
for j,i in enumerate(idx):
    tcp=0.95;wsum=tcp-twi[i]/100.0;base=twi[i];lo=(tcp-wsum*1.2)*100;hi=(tcp-wsum*0.8)*100
    axs[0].errorbar(j,base,yerr=[[base-lo],[hi-base]],fmt="o",color=AMBER,capsize=5,ms=8)
axs[0].axhline(15,ls="--",color=GREY,lw=1);axs[0].set_xticks(range(3));axs[0].set_xticklabels(ex);axs[0].set_ylabel("TWI (%)")
axs[0].set_title("(a) TWI vs OAR risk weight λ ±20%",fontsize=9);axs[0].grid(axis="y",alpha=0.25)
for j,i in enumerate(idx):
    wsum=0.95-twi[i]/100.0;capped=(0.95-wsum)*100;uncap=(1.00-wsum)*100
    axs[1].bar(j-0.18,capped,0.36,color=AMBER,label="TCP capped 95%" if j==0 else "");axs[1].bar(j+0.18,uncap,0.36,color=NAVY,label="TCP uncapped 100%" if j==0 else "")
axs[1].axhline(15,ls="--",color=GREY,lw=1);axs[1].set_xticks(range(3));axs[1].set_xticklabels(ex);axs[1].set_ylabel("TWI (%)")
axs[1].set_title("(b) TWI: TCP display cap effect",fontsize=9);axs[1].legend(fontsize=7.5,frameon=False);axs[1].grid(axis="y",alpha=0.25)
fig.suptitle("Sensitivity of therapeutic-window index (exemplar cases)",fontsize=10.5,fontweight="bold",color=NAVY,y=1.03)
fig.tight_layout();fig.savefig(OUT+"/fig4_sensitivity.png",dpi=200,bbox_inches="tight");plt.close(fig)
# FIG 5 workflow
fig,ax=plt.subplots(figsize=(9,2.7));ax.set_xlim(0,12);ax.set_ylim(0,3);ax.axis("off")
def wbox(x,w,t,fc):ax.add_patch(FancyBboxPatch((x,0.9),w,1.2,boxstyle="round,pad=0.02,rounding_size=0.04",fc=fc,ec="none"));ax.text(x+w/2,1.5,t,ha="center",va="center",color="white",fontsize=8.6)
def warr(x1,x2):ax.add_patch(FancyArrowPatch((x1,1.5),(x2,1.5),arrowstyle="-|>",mutation_scale=15,lw=1.6,color=GREY))
wbox(0.2,3.4,"Tier 1\nAutomated unit/integration\n81/81 PASS",BLUE);wbox(4.2,3.4,"Tier 2\nBatch engine + clinical PDF\n17/17 PASS",TEAL);wbox(8.2,3.6,"Tier 3\nAutonomous on-device UI\n17/17 PASS (~43 min)",GREEN)
warr(3.6,4.2);warr(7.6,8.2)
ax.text(6,2.6,"rbGyanX Mobile build 16 — three-tier validation",ha="center",fontsize=10.5,fontweight="bold",color=NAVY)
ax.text(6,0.45,"Each device case: push DVH → Import → Setup (Rx from header) → Run calculation → Export report",ha="center",fontsize=7.6,style="italic",color=GREY)
fig.savefig(OUT+"/fig5_validation_workflow.png",dpi=200,bbox_inches="tight");plt.close(fig)
print("all figures generated:",sorted(os.listdir(OUT)))
