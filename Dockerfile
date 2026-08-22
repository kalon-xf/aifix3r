FROM kalilinux/kali-rolling
WORKDIR /workspace
COPY scripts/install-tools.sh /tmp/install-tools.sh
RUN chmod +x /tmp/install-tools.sh && /tmp/install-tools.sh core recon web vuln secrets
ENV PATH="/root/.local/bin:${PATH}"
CMD ["bash"]
